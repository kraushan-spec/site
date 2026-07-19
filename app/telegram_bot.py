import re

import requests
from flask import current_app

from app.extensions import db
from app.models import User

_STATE = {"offset": 0, "bot_username": None, "checked_username": False}

START_RE = re.compile(r"^/start\s+(\S+)$")


def _api_url(method):
    token = current_app.config.get("TELEGRAM_BOT_TOKEN")
    if not token:
        return None
    return f"https://api.telegram.org/bot{token}/{method}"


def send_message(chat_id, text):
    url = _api_url("sendMessage")
    if not url:
        return False
    try:
        requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=10)
        return True
    except requests.RequestException:
        current_app.logger.warning("Не удалось отправить сообщение в Telegram chat_id=%s", chat_id)
        return False


def get_bot_username():
    if _STATE["checked_username"]:
        return _STATE["bot_username"]

    _STATE["checked_username"] = True
    url = _api_url("getMe")
    if not url:
        return None
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        if data.get("ok"):
            _STATE["bot_username"] = data["result"].get("username")
    except requests.RequestException:
        pass
    return _STATE["bot_username"]


def _handle_start_command(chat_id, text):
    match = START_RE.match(text.strip())
    if not match:
        send_message(chat_id, "Отправьте команду вида: /start <ваш код из профиля на сайте>")
        return

    code = match.group(1)
    user = User.query.filter_by(telegram_link_code=code).first()
    if not user:
        send_message(chat_id, "Код не найден или уже использован. Сгенерируйте новый в профиле на сайте.")
        return

    user.telegram_chat_id = str(chat_id)
    user.telegram_link_code = None
    db.session.commit()
    send_message(chat_id, f"Готово, {user.full_name}! Аккаунт привязан, теперь вы будете получать напоминания о сроках задач.")


def poll_updates():
    url = _api_url("getUpdates")
    if not url:
        return

    try:
        resp = requests.get(
            url, params={"offset": _STATE["offset"], "timeout": 0}, timeout=10
        )
        data = resp.json()
    except requests.RequestException:
        return

    if not data.get("ok"):
        return

    for update in data.get("result", []):
        _STATE["offset"] = update["update_id"] + 1
        message = update.get("message")
        if not message:
            continue
        text = message.get("text")
        chat_id = message.get("chat", {}).get("id")
        if text and chat_id and text.startswith("/start"):
            _handle_start_command(chat_id, text)
