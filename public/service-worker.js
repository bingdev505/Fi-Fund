
let notificationTimeout;
let tasks = [];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    tasks = event.data.tasks;
    scheduleNextNotification();
  }
});

function scheduleNextNotification() {
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  const now = new Date().getTime();
  let nextNotificationTime = Infinity;
  let nextTask = null;

  tasks.forEach(task => {
    if (task.due_date && task.status !== 'done') {
      const dueDate = new Date(task.due_date).getTime();
      if (dueDate > now && dueDate < nextNotificationTime) {
        nextNotificationTime = dueDate;
        nextTask = task;
      }
    }
  });

  if (nextTask) {
    const delay = nextNotificationTime - now;
    notificationTimeout = setTimeout(() => {
      self.registration.showNotification('Task Due!', {
        body: `Your task "${nextTask.name}" is due now.`,
        icon: '/icons/icon-192x192.png',
        tag: nextTask.id,
      });
      // After showing notification, reschedule for the next one
      scheduleNextNotification();
    }, delay);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/tasks');
    })
  );
});
