from datetime import datetime

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user

from app.decorators import roles_required
from app.extensions import db
from app.forms import DepartmentForm, ImportScheduleForm, UserForm
from app.models import ROLE_ADMIN, Comment, Department, Task, User
from app.schedule_import import parse_schedule_file

bp = Blueprint("admin", __name__, url_prefix="/admin")


@bp.route("/users")
@roles_required(ROLE_ADMIN)
def users():
    all_users = User.query.order_by(User.full_name).all()
    return render_template("admin/users.html", users=all_users)


@bp.route("/users/new", methods=["GET", "POST"])
@roles_required(ROLE_ADMIN)
def new_user():
    form = UserForm()
    form.department_id.choices = [(0, "—")] + [
        (d.id, d.name) for d in Department.query.order_by(Department.name).all()
    ]

    if form.validate_on_submit():
        if not form.password.data:
            form.password.errors.append("Пароль обязателен для нового пользователя")
        elif User.query.filter_by(login=form.login.data.strip()).first():
            form.login.errors.append("Такой логин уже занят")
        else:
            user = User(
                full_name=form.full_name.data.strip(),
                login=form.login.data.strip(),
                role=form.role.data,
                department_id=form.department_id.data or None,
                is_active_flag=form.is_active_flag.data,
                can_manage_schedule=form.can_manage_schedule.data,
            )
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.commit()
            flash("Пользователь создан", "success")
            return redirect(url_for("admin.users"))

    return render_template("admin/user_form.html", form=form, user=None)


@bp.route("/users/<int:user_id>/edit", methods=["GET", "POST"])
@roles_required(ROLE_ADMIN)
def edit_user(user_id):
    user = User.query.get_or_404(user_id)
    form = UserForm(obj=user)
    form.department_id.choices = [(0, "—")] + [
        (d.id, d.name) for d in Department.query.order_by(Department.name).all()
    ]
    if request.method == "GET":
        form.department_id.data = user.department_id or 0

    if form.validate_on_submit():
        existing = User.query.filter_by(login=form.login.data.strip()).first()
        if existing and existing.id != user.id:
            form.login.errors.append("Такой логин уже занят")
        else:
            user.full_name = form.full_name.data.strip()
            user.login = form.login.data.strip()
            user.role = form.role.data
            user.department_id = form.department_id.data or None
            user.is_active_flag = form.is_active_flag.data
            user.can_manage_schedule = form.can_manage_schedule.data
            if form.password.data:
                user.set_password(form.password.data)
            db.session.commit()
            flash("Пользователь обновлён", "success")
            return redirect(url_for("admin.users"))

    return render_template("admin/user_form.html", form=form, user=user)


@bp.route("/departments")
@roles_required(ROLE_ADMIN)
def departments():
    all_departments = Department.query.order_by(Department.name).all()
    return render_template("admin/departments.html", departments=all_departments)


@bp.route("/departments/new", methods=["GET", "POST"])
@roles_required(ROLE_ADMIN)
def new_department():
    form = DepartmentForm()
    if form.validate_on_submit():
        if Department.query.filter_by(name=form.name.data.strip()).first():
            form.name.errors.append("Подразделение с таким названием уже есть")
        else:
            db.session.add(Department(name=form.name.data.strip()))
            db.session.commit()
            flash("Подразделение создано", "success")
            return redirect(url_for("admin.departments"))
    return render_template("admin/department_form.html", form=form, department=None)


@bp.route("/departments/<int:department_id>/edit", methods=["GET", "POST"])
@roles_required(ROLE_ADMIN)
def edit_department(department_id):
    department = Department.query.get_or_404(department_id)
    form = DepartmentForm(obj=department)
    if form.validate_on_submit():
        existing = Department.query.filter_by(name=form.name.data.strip()).first()
        if existing and existing.id != department.id:
            form.name.errors.append("Подразделение с таким названием уже есть")
        else:
            department.name = form.name.data.strip()
            db.session.commit()
            flash("Подразделение обновлено", "success")
            return redirect(url_for("admin.departments"))
    return render_template("admin/department_form.html", form=form, department=department)


@bp.route("/import-schedule", methods=["GET", "POST"])
@roles_required(ROLE_ADMIN)
def import_schedule():
    form = ImportScheduleForm()
    current_year = datetime.now().year
    form.year.choices = [(y, str(y)) for y in range(current_year - 1, current_year + 2)]
    if request.method == "GET":
        form.year.data = current_year
        form.month.data = datetime.now().month

    if form.validate_on_submit():
        try:
            rows, skipped = parse_schedule_file(form.file.data, form.year.data, form.month.data)
        except ValueError as exc:
            flash(str(exc), "danger")
            return render_template("admin/import_schedule.html", form=form)

        created_tasks = []
        for row in rows:
            task = Task(
                title=row["title"],
                task_type="network_schedule",
                department_id=row["department_id"],
                assignee_id=current_user.id,
                importance="medium",
                deadline=row["deadline"],
                created_by_id=current_user.id,
            )
            db.session.add(task)
            db.session.flush()
            db.session.add(Comment(
                task_id=task.id,
                author_id=current_user.id,
                body=(
                    f"Импортировано из файла. Подразделение/исполнитель (как в файле): "
                    f"{row['raw_dept_text'] or '—'}. Срок (как в файле): {row['raw_deadline_text'] or '—'}."
                ),
            ))
            created_tasks.append(task)

        db.session.commit()
        return render_template(
            "admin/import_schedule_result.html",
            created_tasks=created_tasks,
            skipped=skipped,
        )

    return render_template("admin/import_schedule.html", form=form)
