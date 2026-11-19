self.addEventListener('activate', async () => {
    const result = await Notification.requestPermission();
    if (result === 'denied') return console.log('Sorry i shit in your pants...');
    const registration = await navigator.serviceWorker.ready;

    function connect() {
        console.log('Notification service connecting...');
        const socket = new WebSocket('/chatbot');
        socket.onclose = connect;
        socket.onmessage = e => {
            const packet = JSON.parse(e.data);
            switch (packet.t) {
            case 'notify':
                registration.showNotification('New prompt', {
                    body: packet.content,
                    badge: '/favicon.ico',
                    data: packet.id,
                    navigate: `/chat-akp#${encodeURI(packet.target)}`
                });
                break;
            }
        }
    }; connect();
})