# Popup Testing Guide

Use these browser console snippets (on `/dashboard`) to test all popup types.

## 1. Test `reminder_completed` Popup

```js
(async () => {
  // Get your first reminder (or create one)
  let remindersRes = await fetch("/api/reminders");
  let remindersBody = await remindersRes.json();
  let reminder = remindersBody?.reminders?.[0];

  if (!reminder) {
    const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const createRes = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Test reminder for completed popup",
        remind_at: remindAt,
        tone: "motivational",
        notification_method: "in_app",
      }),
    });
    const createBody = await createRes.json();
    reminder = createBody?.reminder;
  }

  // Trigger reminder_completed event
  const eventRes = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "reminder_completed",
      event_data: {
        reminder_id: reminder.id,
        message: reminder.message,
        notification_method: reminder.notification_method,
      },
      reminder_id: reminder.id,
    }),
  });

  console.log("Event logged:", await eventRes.json());
  location.reload(); // PopupSystem fetches on mount
})();
```

## 2. Test `reminder_due` Popup

```js
(async () => {
  // Get your first reminder (or create one)
  let remindersRes = await fetch("/api/reminders");
  let remindersBody = await remindersRes.json();
  let reminder = remindersBody?.reminders?.[0];

  if (!reminder) {
    const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const createRes = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Test reminder for due popup",
        remind_at: remindAt,
        tone: "motivational",
        notification_method: "in_app",
      }),
    });
    const createBody = await createRes.json();
    reminder = createBody?.reminder;
  }

  // Get contact name if exists
  let contactName = "this contact";
  if (reminder.contact_id) {
    const contactRes = await fetch(`/api/contacts/${reminder.contact_id}`);
    const contactBody = await contactRes.json();
    contactName = contactBody?.contact?.name || "this contact";
  }

  // Trigger reminder_due event
  const eventRes = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "reminder_due",
      event_data: {
        reminder_id: reminder.id,
        contact_name: contactName,
      },
      reminder_id: reminder.id,
      contact_id: reminder.contact_id || undefined,
    }),
  });

  console.log("Event logged:", await eventRes.json());
  location.reload();
})();
```

## 3. Test `email_opened` Popup

```js
(async () => {
  // Get your first contact (or create one)
  let contactsRes = await fetch("/api/contacts");
  let contactsBody = await contactsRes.json();
  let contact = Array.isArray(contactsBody?.contacts) ? contactsBody.contacts[0] : contactsBody?.contact;

  if (!contact) {
    const createRes = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Contact",
        email: "test@example.com",
      }),
    });
    const createBody = await createRes.json();
    contact = createBody?.contact;
  }

  // Trigger email_opened event
  const eventRes = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "email_opened",
      event_data: {
        contact_name: contact.name,
        thread_link: "https://mail.google.com/mail/u/0/#inbox/123",
      },
      contact_id: contact.id,
      source: "extension_gmail",
    }),
  });

  console.log("Event logged:", await eventRes.json());
  location.reload();
})();
```

## 4. Test `no_reply_after_n_days` Popup

```js
(async () => {
  // Get your first contact (or create one)
  let contactsRes = await fetch("/api/contacts");
  let contactsBody = await contactsRes.json();
  let contact = Array.isArray(contactsBody?.contacts) ? contactsBody.contacts[0] : contactsBody?.contact;

  if (!contact) {
    const createRes = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Contact",
        email: "test@example.com",
      }),
    });
    const createBody = await createRes.json();
    contact = createBody?.contact;
  }

  // Trigger no_reply_after_n_days event
  const eventRes = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "no_reply_after_n_days",
      event_data: {
        contact_name: contact.name,
        days: 3, // 3 days since last reply
        thread_link: "https://mail.google.com/mail/u/0/#inbox/123",
      },
      contact_id: contact.id,
      source: "extension_gmail",
    }),
  });

  console.log("Event logged:", await eventRes.json());
  location.reload();
})();
```

## All-in-One Test Script

Run this to test all 4 popup types in sequence:

```js
(async () => {
  console.log("🧪 Testing all popup types...");

  // Get or create reminder
  let remindersRes = await fetch("/api/reminders");
  let remindersBody = await remindersRes.json();
  let reminder = remindersBody?.reminders?.[0];

  if (!reminder) {
    const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const createRes = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Test reminder",
        remind_at: remindAt,
        tone: "motivational",
        notification_method: "in_app",
      }),
    });
    const createBody = await createRes.json();
    reminder = createBody?.reminder;
  }

  // Get or create contact
  let contactsRes = await fetch("/api/contacts");
  let contactsBody = await contactsRes.json();
  let contact = Array.isArray(contactsBody?.contacts) ? contactsBody.contacts[0] : contactsBody?.contact;

  if (!contact) {
    const createRes = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Contact",
        email: "test@example.com",
      }),
    });
    const createBody = await createRes.json();
    contact = createBody?.contact;
  }

  const events = [
    {
      name: "reminder_completed",
      body: {
        event_type: "reminder_completed",
        event_data: {
          reminder_id: reminder.id,
          message: reminder.message,
          notification_method: reminder.notification_method,
        },
        reminder_id: reminder.id,
      },
    },
    {
      name: "reminder_due",
      body: {
        event_type: "reminder_due",
        event_data: {
          reminder_id: reminder.id,
          contact_name: contact.name,
        },
        reminder_id: reminder.id,
        contact_id: reminder.contact_id || contact.id,
      },
    },
    {
      name: "email_opened",
      body: {
        event_type: "email_opened",
        event_data: {
          contact_name: contact.name,
          thread_link: "https://mail.google.com/mail/u/0/#inbox/123",
        },
        contact_id: contact.id,
        source: "extension_gmail",
      },
    },
    {
      name: "no_reply_after_n_days",
      body: {
        event_type: "no_reply_after_n_days",
        event_data: {
          contact_name: contact.name,
          days: 3,
          thread_link: "https://mail.google.com/mail/u/0/#inbox/123",
        },
        contact_id: contact.id,
        source: "extension_gmail",
      },
    },
  ];

  // Trigger each event with a delay
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`\n📤 Triggering ${event.name}...`);
    
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event.body),
    });

    const result = await res.json();
    console.log(`✅ ${event.name}:`, result);

    // Wait 2 seconds between events (to avoid cooldown)
    if (i < events.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("\n✨ All events triggered! Reloading page to see popups...");
  setTimeout(() => location.reload(), 1000);
})();
```

## Notes

- **Cooldown**: Each popup type has a cooldown period. Wait a few seconds between tests.
- **Popup System**: Popups are fetched on page load and every 30 seconds. After triggering an event, reload the page to see the popup immediately.
- **Reminder ID Required**: `reminder_due` and `reminder_completed` require a valid `reminder_id`.
- **Contact ID Required**: `email_opened` and `no_reply_after_n_days` require a valid `contact_id`.

