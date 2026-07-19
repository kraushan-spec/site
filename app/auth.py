from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user

from app.forms import LoginForm
from app.models import User

bp = Blueprint("auth", __name__)


@bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("tasks.list_tasks"))

    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(login=form.login.data.strip()).first()
        if user and user.is_active and user.check_password(form.password.data):
            login_user(user)
            next_url = request.args.get("next")
            return redirect(next_url or url_for("tasks.list_tasks"))
        flash("Неверный логин или пароль", "danger")

    return render_template("auth/login.html", form=form)


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("auth.login"))
