from flask_wtf import FlaskForm
from flask_wtf.file import FileField
from wtforms import (
    BooleanField, DateField, DateTimeField, PasswordField, SelectField,
    StringField, SubmitField, TextAreaField,
)
from wtforms.validators import DataRequired, Length, Optional

from app.models import (
    IMPORTANCE_LABELS, ROLE_LABELS, TASK_TYPE_LABELS,
)


class LoginForm(FlaskForm):
    login = StringField("Логин", validators=[DataRequired()])
    password = PasswordField("Пароль", validators=[DataRequired()])
    submit_btn = SubmitField("Войти")


class TaskForm(FlaskForm):
    title = StringField("Название", validators=[DataRequired(), Length(max=500)])
    task_type = SelectField("Тип задачи", choices=list(TASK_TYPE_LABELS.items()))
    department_id = SelectField("Подразделение", coerce=int)
    assignee_id = SelectField("Исполнитель", coerce=int)
    backup_assignee_id = SelectField("Замещающий исполнитель", coerce=int, validators=[Optional()])
    deadline = DateTimeField("Срок исполнения", format="%Y-%m-%dT%H:%M", validators=[DataRequired()])
    importance = SelectField("Важность", choices=list(IMPORTANCE_LABELS.items()))
    submit_btn = SubmitField("Сохранить")


class CommentForm(FlaskForm):
    body = TextAreaField("Комментарий", validators=[DataRequired()])
    submit_btn = SubmitField("Отправить")


class AttachmentForm(FlaskForm):
    file = FileField("Файл", validators=[DataRequired()])
    submit_btn = SubmitField("Загрузить")


class UserForm(FlaskForm):
    full_name = StringField("ФИО", validators=[DataRequired(), Length(max=255)])
    login = StringField("Логин", validators=[DataRequired(), Length(max=80)])
    password = PasswordField(
        "Пароль",
        validators=[Optional(), Length(min=4, message="Минимум 4 символа")],
    )
    role = SelectField("Роль", choices=list(ROLE_LABELS.items()))
    department_id = SelectField("Подразделение", coerce=int, validators=[Optional()])
    is_active_flag = BooleanField("Активен", default=True)
    submit_btn = SubmitField("Сохранить")


class DepartmentForm(FlaskForm):
    name = StringField("Название подразделения", validators=[DataRequired(), Length(max=255)])
    submit_btn = SubmitField("Сохранить")


MONTH_LABELS = [
    (1, "Январь"), (2, "Февраль"), (3, "Март"), (4, "Апрель"),
    (5, "Май"), (6, "Июнь"), (7, "Июль"), (8, "Август"),
    (9, "Сентябрь"), (10, "Октябрь"), (11, "Ноябрь"), (12, "Декабрь"),
]


class ImportScheduleForm(FlaskForm):
    file = FileField("Файл сетевого графика (.xls/.xlsx)", validators=[DataRequired()])
    year = SelectField("Год", coerce=int)
    month = SelectField("Месяц", coerce=int, choices=MONTH_LABELS)
    submit_btn = SubmitField("Импортировать")


class ReportForm(FlaskForm):
    date_from = DateField("С", validators=[DataRequired()])
    date_to = DateField("По", validators=[DataRequired()])
    format = SelectField("Формат", choices=[("xlsx", "Excel (.xlsx)"), ("csv", "CSV")])
    submit_btn = SubmitField("Скачать отчёт")
