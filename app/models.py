from datetime import datetime, timedelta

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db

ROLE_ADMIN = "admin"
ROLE_MANAGER = "manager"
ROLE_EXECUTOR = "executor"

ROLE_LABELS = {
    ROLE_ADMIN: "Админ",
    ROLE_MANAGER: "Руководитель",
    ROLE_EXECUTOR: "Исполнитель",
}

TASK_TYPE_NETWORK_SCHEDULE = "network_schedule"
TASK_TYPE_ADJACENT_ORDER = "adjacent_order"
TASK_TYPE_DIRECTOR_REQUEST = "director_request"
TASK_TYPE_PERSONAL_ORDER = "personal_order"

TASK_TYPE_LABELS = {
    TASK_TYPE_NETWORK_SCHEDULE: "Сетевой график",
    TASK_TYPE_ADJACENT_ORDER: "Поручение от смежного подразделения",
    TASK_TYPE_DIRECTOR_REQUEST: "Запрос от директора",
    TASK_TYPE_PERSONAL_ORDER: "Личное поручение",
}

TASK_TYPE_COLORS = {
    TASK_TYPE_NETWORK_SCHEDULE: "primary",
    TASK_TYPE_ADJACENT_ORDER: "info",
    TASK_TYPE_DIRECTOR_REQUEST: "dark",
    TASK_TYPE_PERSONAL_ORDER: "secondary",
}

IMPORTANCE_HIGH = "high"
IMPORTANCE_MEDIUM = "medium"
IMPORTANCE_LOW = "low"

IMPORTANCE_LABELS = {
    IMPORTANCE_HIGH: "Высокая",
    IMPORTANCE_MEDIUM: "Средняя",
    IMPORTANCE_LOW: "Низкая",
}

STATUS_DONE = "done"
STATUS_OVERDUE = "overdue"
STATUS_DUE_SOON = "due_soon"
STATUS_IN_PROGRESS = "in_progress"

STATUS_LABELS = {
    STATUS_DONE: "Выполнено",
    STATUS_OVERDUE: "Просрочено",
    STATUS_DUE_SOON: "Срок приближается",
    STATUS_IN_PROGRESS: "В работе",
}

# Bootstrap-совместимые цвета для бейджей/точек статуса
STATUS_COLORS = {
    STATUS_DONE: "success",
    STATUS_OVERDUE: "danger",
    STATUS_DUE_SOON: "warning",
    STATUS_IN_PROGRESS: "secondary",
}

DUE_SOON_WINDOW = timedelta(days=2)


class Department(db.Model):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)

    users = db.relationship("User", back_populates="department")
    tasks = db.relationship("Task", back_populates="department")

    def __repr__(self):
        return f"<Department {self.name}>"


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(255), nullable=False)
    login = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=ROLE_EXECUTOR)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)
    telegram_chat_id = db.Column(db.String(64), nullable=True)
    telegram_link_code = db.Column(db.String(16), unique=True, nullable=True)
    is_active_flag = db.Column("is_active", db.Boolean, nullable=False, default=True)
    can_manage_schedule = db.Column(db.Boolean, nullable=False, default=False)

    department = db.relationship("Department", back_populates="users")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def is_active(self):
        return self.is_active_flag

    @property
    def role_label(self):
        return ROLE_LABELS.get(self.role, self.role)

    def __repr__(self):
        return f"<User {self.login}>"


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    task_type = db.Column(db.String(30), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    backup_assignee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    deadline = db.Column(db.DateTime, nullable=False)
    importance = db.Column(db.String(20), nullable=False, default=IMPORTANCE_MEDIUM)
    is_done = db.Column(db.Boolean, nullable=False, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

    department = db.relationship("Department", back_populates="tasks")
    assignee = db.relationship("User", foreign_keys=[assignee_id])
    backup_assignee = db.relationship("User", foreign_keys=[backup_assignee_id])
    created_by = db.relationship("User", foreign_keys=[created_by_id])
    comments = db.relationship(
        "Comment", back_populates="task", order_by="Comment.created_at",
        cascade="all, delete-orphan",
    )
    attachments = db.relationship(
        "Attachment", back_populates="task", order_by="Attachment.uploaded_at",
        cascade="all, delete-orphan",
    )

    @property
    def status(self):
        if self.is_done:
            return STATUS_DONE
        now = datetime.now()
        if self.deadline < now:
            return STATUS_OVERDUE
        if self.deadline - now <= DUE_SOON_WINDOW:
            return STATUS_DUE_SOON
        return STATUS_IN_PROGRESS

    @property
    def is_late(self):
        return bool(self.is_done and self.completed_at and self.completed_at > self.deadline)

    @property
    def status_label(self):
        return STATUS_LABELS[self.status]

    @property
    def status_color(self):
        return STATUS_COLORS[self.status]

    @property
    def task_type_label(self):
        return TASK_TYPE_LABELS.get(self.task_type, self.task_type)

    @property
    def task_type_color(self):
        return TASK_TYPE_COLORS.get(self.task_type, "secondary")

    @property
    def importance_label(self):
        return IMPORTANCE_LABELS.get(self.importance, self.importance)

    def __repr__(self):
        return f"<Task {self.id} {self.title!r}>"


class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

    task = db.relationship("Task", back_populates="comments")
    author = db.relationship("User")


class Attachment(db.Model):
    __tablename__ = "attachments"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    filename = db.Column(db.String(500), nullable=False)
    stored_path = db.Column(db.String(500), nullable=False)
    uploaded_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

    task = db.relationship("Task", back_populates="attachments")
    uploaded_by = db.relationship("User")


class NotificationLog(db.Model):
    __tablename__ = "notification_logs"
    __table_args__ = (
        db.UniqueConstraint("task_id", "recipient_id", "kind", name="uq_notification_once"),
    )

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    kind = db.Column(db.String(64), nullable=False)
    sent_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
