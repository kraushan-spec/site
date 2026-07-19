from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from app.models import STATUS_DUE_SOON, STATUS_OVERDUE, Task
from app.notifications import get_task_recipients, notify_once
from app.telegram_bot import poll_updates


def _round_down(dt, minutes):
    floored = (dt.minute // minutes) * minutes
    return dt.replace(minute=floored, second=0, microsecond=0)


def _reminder_for_task(task, now):
    status = task.status

    if status == STATUS_OVERDUE:
        kind = f"overdue_{_round_down(now, 30):%Y%m%d%H%M}"
        text = f"⏰ Просрочено: «{task.title}» — срок был {task.deadline:%d.%m.%Y %H:%M}"
    elif status == STATUS_DUE_SOON:
        kind = f"duesoon_{now:%Y%m%d%H}"
        text = f"🟡 Срок приближается: «{task.title}» — до {task.deadline:%d.%m.%Y %H:%M}"
    else:
        return

    for recipient in get_task_recipients(task):
        notify_once(task, recipient, kind, text)


def check_and_send_reminders(app):
    with app.app_context():
        now = datetime.now()
        for task in Task.query.filter_by(is_done=False).all():
            _reminder_for_task(task, now)


def poll_telegram_updates(app):
    with app.app_context():
        poll_updates()


def init_scheduler(app):
    # run.py disables the Werkzeug auto-reloader (use_reloader=False), so there is
    # only ever one process here — no need to guard against a reloader child/parent split.
    if not app.config.get("TELEGRAM_BOT_TOKEN"):
        app.logger.info("TELEGRAM_BOT_TOKEN не задан — Telegram-уведомления отключены")
        return

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(poll_telegram_updates, "interval", seconds=10, args=[app], id="poll_telegram")
    scheduler.add_job(check_and_send_reminders, "interval", minutes=1, args=[app], id="check_reminders")
    scheduler.start()
    app.logger.info("Планировщик Telegram-уведомлений запущен")
