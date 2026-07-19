from app.extensions import db
from app.models import NotificationLog, ROLE_ADMIN, ROLE_MANAGER, User
from app.telegram_bot import send_message


def get_task_recipients(task):
    recipients = {}
    for person in (task.assignee, task.backup_assignee):
        if person:
            recipients[person.id] = person

    managers = User.query.filter_by(role=ROLE_MANAGER, department_id=task.department_id)
    for manager in managers:
        recipients[manager.id] = manager

    return list(recipients.values())


def get_status_change_recipients(task):
    """Исполнитель, замещающий, руководители подразделения + все админы + автор поручения."""
    recipients = {person.id: person for person in get_task_recipients(task)}

    for admin in User.query.filter_by(role=ROLE_ADMIN):
        recipients[admin.id] = admin

    if task.created_by:
        recipients[task.created_by.id] = task.created_by

    return list(recipients.values())


def notify_event(task, text, kind, recipients=None):
    """Отправить одноразовое событийное уведомление (создание, завершение и т.п.)."""
    if recipients is None:
        recipients = get_task_recipients(task)

    for recipient in recipients:
        if not recipient.telegram_chat_id:
            continue
        send_message(recipient.telegram_chat_id, text)
        db.session.add(NotificationLog(task_id=task.id, recipient_id=recipient.id, kind=kind))
    db.session.commit()


def notify_once(task, recipient, kind, text):
    """Отправить напоминание получателю, только если такое (task, recipient, kind) ещё не отправлялось."""
    if not recipient or not recipient.telegram_chat_id:
        return
    already_sent = NotificationLog.query.filter_by(
        task_id=task.id, recipient_id=recipient.id, kind=kind
    ).first()
    if already_sent:
        return

    send_message(recipient.telegram_chat_id, text)
    db.session.add(NotificationLog(task_id=task.id, recipient_id=recipient.id, kind=kind))
    db.session.commit()
