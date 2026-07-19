import calendar as calendar_module
import os
import uuid
from datetime import datetime

from flask import (
    Blueprint, abort, current_app, flash, redirect, render_template,
    request, send_from_directory, url_for,
)
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename

from app.extensions import db
from app.forms import AttachmentForm, CommentForm, TaskForm
from app.models import (
    Attachment, Comment, Department, ROLE_ADMIN, ROLE_EXECUTOR, ROLE_MANAGER,
    STATUS_LABELS, TASK_TYPE_LABELS, Task, User,
)

bp = Blueprint("tasks", __name__, url_prefix="/tasks")

RU_MONTH_NAMES = [
    "", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
]


def visible_tasks_query():
    if current_user.role == ROLE_ADMIN:
        return Task.query
    if current_user.role == ROLE_MANAGER:
        return Task.query.filter(Task.department_id == current_user.department_id)
    return Task.query.filter(
        (Task.assignee_id == current_user.id)
        | (Task.backup_assignee_id == current_user.id)
    )


def visible_users_for_filter():
    if current_user.role == ROLE_ADMIN:
        return User.query.order_by(User.full_name).all()
    if current_user.role == ROLE_MANAGER:
        return User.query.filter(
            User.department_id == current_user.department_id
        ).order_by(User.full_name).all()
    return [current_user]


def can_view_task(task):
    if current_user.role == ROLE_ADMIN:
        return True
    if current_user.role == ROLE_MANAGER:
        return task.department_id == current_user.department_id
    return current_user.id in (task.assignee_id, task.backup_assignee_id)


def can_manage_task(task):
    if current_user.role == ROLE_ADMIN:
        return True
    if current_user.role == ROLE_MANAGER:
        return task.department_id == current_user.department_id
    return False


def can_complete_task(task):
    if can_manage_task(task):
        return True
    return current_user.id in (task.assignee_id, task.backup_assignee_id)


def _department_choices():
    return [(d.id, d.name) for d in Department.query.order_by(Department.name).all()]


def _user_choices(department_id=None):
    query = User.query.filter(User.is_active_flag.is_(True))
    if department_id:
        query = query.filter(User.department_id == department_id)
    return [(u.id, u.full_name) for u in query.order_by(User.full_name).all()]


@bp.route("")
@login_required
def list_tasks():
    query = visible_tasks_query()

    department_id = request.args.get("department_id", type=int)
    assignee_id = request.args.get("assignee_id", type=int)
    importance = request.args.get("importance")
    task_type = request.args.get("task_type")
    status = request.args.get("status")

    if department_id:
        query = query.filter(Task.department_id == department_id)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if importance:
        query = query.filter(Task.importance == importance)
    if task_type:
        query = query.filter(Task.task_type == task_type)

    tasks = query.order_by(Task.deadline).all()
    if status:
        tasks = [t for t in tasks if t.status == status]

    departments = (
        Department.query.order_by(Department.name).all()
        if current_user.role == ROLE_ADMIN
        else []
    )

    return render_template(
        "tasks/list.html",
        tasks=tasks,
        departments=departments,
        users=visible_users_for_filter(),
        task_types=TASK_TYPE_LABELS,
        statuses=STATUS_LABELS,
        filters={
            "department_id": department_id,
            "assignee_id": assignee_id,
            "importance": importance,
            "task_type": task_type,
            "status": status,
        },
    )


@bp.route("/calendar")
@login_required
def calendar_view():
    today = datetime.utcnow()
    year = request.args.get("year", type=int, default=today.year)
    month = request.args.get("month", type=int, default=today.month)
    if month < 1:
        month, year = 12, year - 1
    elif month > 12:
        month, year = 1, year + 1

    tasks = visible_tasks_query().all()
    tasks_by_day = {}
    for t in tasks:
        if t.deadline.year == year and t.deadline.month == month:
            tasks_by_day.setdefault(t.deadline.day, []).append(t)

    cal = calendar_module.Calendar(firstweekday=0)
    weeks = cal.monthdayscalendar(year, month)

    prev_month, prev_year = (12, year - 1) if month == 1 else (month - 1, year)
    next_month, next_year = (1, year + 1) if month == 12 else (month + 1, year)

    return render_template(
        "tasks/calendar.html",
        weeks=weeks,
        tasks_by_day=tasks_by_day,
        year=year,
        month=month,
        month_name=RU_MONTH_NAMES[month],
        prev_month=prev_month,
        prev_year=prev_year,
        next_month=next_month,
        next_year=next_year,
        today=today.date(),
    )


@bp.route("/new", methods=["GET", "POST"])
@login_required
def new_task():
    if current_user.role not in (ROLE_ADMIN, ROLE_MANAGER):
        abort(403)

    form = TaskForm()
    is_admin = current_user.role == ROLE_ADMIN
    form.department_id.choices = (
        _department_choices()
        if is_admin
        else [(current_user.department_id, current_user.department.name)]
    )
    dept_for_users = None if is_admin else current_user.department_id
    form.assignee_id.choices = _user_choices(dept_for_users)
    form.backup_assignee_id.choices = [(0, "—")] + _user_choices(dept_for_users)

    if not is_admin:
        form.department_id.data = current_user.department_id

    if form.validate_on_submit():
        task = Task(
            title=form.title.data.strip(),
            task_type=form.task_type.data,
            department_id=form.department_id.data,
            assignee_id=form.assignee_id.data,
            backup_assignee_id=form.backup_assignee_id.data or None,
            deadline=form.deadline.data,
            importance=form.importance.data,
            created_by_id=current_user.id,
        )
        db.session.add(task)
        db.session.commit()
        flash("Задача создана", "success")
        return redirect(url_for("tasks.view_task", task_id=task.id))

    return render_template("tasks/form.html", form=form, task=None)


@bp.route("/<int:task_id>")
@login_required
def view_task(task_id):
    task = Task.query.get_or_404(task_id)
    if not can_view_task(task):
        abort(403)
    return render_template(
        "tasks/detail.html",
        task=task,
        comment_form=CommentForm(),
        attachment_form=AttachmentForm(),
        can_manage=can_manage_task(task),
        can_complete=can_complete_task(task),
        can_reassign=(current_user.role == ROLE_EXECUTOR and current_user.id == task.assignee_id),
    )


@bp.route("/<int:task_id>/edit", methods=["GET", "POST"])
@login_required
def edit_task(task_id):
    task = Task.query.get_or_404(task_id)
    if not can_manage_task(task):
        abort(403)

    form = TaskForm(obj=task)
    is_admin = current_user.role == ROLE_ADMIN
    form.department_id.choices = (
        _department_choices() if is_admin else [(task.department_id, task.department.name)]
    )
    dept_for_users = None if is_admin else task.department_id
    form.assignee_id.choices = _user_choices(dept_for_users)
    form.backup_assignee_id.choices = [(0, "—")] + _user_choices(dept_for_users)

    if request.method == "GET":
        form.backup_assignee_id.data = task.backup_assignee_id or 0
        form.department_id.data = task.department_id

    if form.validate_on_submit():
        task.title = form.title.data.strip()
        task.task_type = form.task_type.data
        task.department_id = form.department_id.data
        task.assignee_id = form.assignee_id.data
        task.backup_assignee_id = form.backup_assignee_id.data or None
        task.deadline = form.deadline.data
        task.importance = form.importance.data
        db.session.commit()
        flash("Задача обновлена", "success")
        return redirect(url_for("tasks.view_task", task_id=task.id))

    return render_template("tasks/form.html", form=form, task=task)


@bp.route("/<int:task_id>/complete", methods=["POST"])
@login_required
def complete_task(task_id):
    task = Task.query.get_or_404(task_id)
    if not can_complete_task(task):
        abort(403)
    task.is_done = True
    task.completed_at = datetime.utcnow()
    db.session.commit()
    flash("Задача отмечена как выполненная", "success")
    return redirect(url_for("tasks.view_task", task_id=task.id))


@bp.route("/<int:task_id>/reassign", methods=["POST"])
@login_required
def reassign_task(task_id):
    task = Task.query.get_or_404(task_id)
    is_owner_executor = current_user.role == ROLE_EXECUTOR and current_user.id == task.assignee_id
    if not (is_owner_executor or can_manage_task(task)):
        abort(403)

    new_assignee_id = request.form.get("new_assignee_id", type=int)
    new_assignee = User.query.filter(
        User.id == new_assignee_id, User.department_id == task.department_id
    ).first()
    if not new_assignee:
        flash("Выберите сотрудника того же подразделения", "danger")
        return redirect(url_for("tasks.view_task", task_id=task.id))

    task.assignee_id = new_assignee.id
    db.session.commit()
    flash(f"Задача передана: {new_assignee.full_name}", "success")

    if can_view_task(task):
        return redirect(url_for("tasks.view_task", task_id=task.id))
    return redirect(url_for("tasks.list_tasks"))


@bp.route("/<int:task_id>/comment", methods=["POST"])
@login_required
def add_comment(task_id):
    task = Task.query.get_or_404(task_id)
    if not can_view_task(task):
        abort(403)

    form = CommentForm()
    if form.validate_on_submit():
        comment = Comment(task_id=task.id, author_id=current_user.id, body=form.body.data.strip())
        db.session.add(comment)
        db.session.commit()
    return redirect(url_for("tasks.view_task", task_id=task.id))


def _allowed_file(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in current_app.config["ALLOWED_EXTENSIONS"]


@bp.route("/<int:task_id>/attachment", methods=["POST"])
@login_required
def add_attachment(task_id):
    task = Task.query.get_or_404(task_id)
    if not can_view_task(task):
        abort(403)

    form = AttachmentForm()
    if form.validate_on_submit():
        file = form.file.data
        original_name = secure_filename(file.filename)
        if not original_name or not _allowed_file(original_name):
            flash("Недопустимый тип файла", "danger")
            return redirect(url_for("tasks.view_task", task_id=task.id))

        task_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], str(task.id))
        os.makedirs(task_dir, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}_{original_name}"
        file.save(os.path.join(task_dir, stored_name))

        attachment = Attachment(
            task_id=task.id,
            uploaded_by_id=current_user.id,
            filename=original_name,
            stored_path=f"{task.id}/{stored_name}",
        )
        db.session.add(attachment)
        db.session.commit()
        flash("Файл прикреплён", "success")
    return redirect(url_for("tasks.view_task", task_id=task.id))


@bp.route("/<int:task_id>/attachments/<int:attachment_id>/download")
@login_required
def download_attachment(task_id, attachment_id):
    task = Task.query.get_or_404(task_id)
    if not can_view_task(task):
        abort(403)
    attachment = Attachment.query.filter_by(id=attachment_id, task_id=task.id).first_or_404()
    return send_from_directory(
        current_app.config["UPLOAD_FOLDER"],
        attachment.stored_path,
        as_attachment=True,
        download_name=attachment.filename,
    )
