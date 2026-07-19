import secrets
import string

from flask import Blueprint, flash, redirect, render_template, url_for
from flask_login import current_user, login_required

from app.extensions import db
from app.models import User
from app.telegram_bot import get_bot_username

bp = Blueprint("profile", __name__, url_prefix="/profile")


def _generate_link_code():
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


@bp.route("")
@login_required
def view_profile():
    return render_template("profile.html", bot_username=get_bot_username())


@bp.route("/link", methods=["POST"])
@login_required
def link_telegram():
    code = _generate_link_code()
    while User.query.filter_by(telegram_link_code=code).first():
        code = _generate_link_code()

    current_user.telegram_link_code = code
    db.session.commit()
    return redirect(url_for("profile.view_profile"))


@bp.route("/unlink", methods=["POST"])
@login_required
def unlink_telegram():
    current_user.telegram_chat_id = None
    current_user.telegram_link_code = None
    db.session.commit()
    flash("Telegram отвязан", "success")
    return redirect(url_for("profile.view_profile"))
