const WebSocket = require('ws');
const readline = require('readline');

const SERVER_URL = 'ws://localhost:1234';
console.log(`🔌 Connectant al servidor WebSocket a ${SERVER_URL}...`);
const ws = new WebSocket(SERVER_URL);
let currentPosition = { x: 0, y: 0 };

function displayPosition() {
    process.stdout.write('\r' + ' '.repeat(process.stdout.columns) + '\r');
    process.stdout.write(`Posición actual: (${currentPosition.x}, ${currentPosition.y}) | Muevete con las flechas | Sortir: 'q' `);
}

ws.on('open', () => {
    console.log('Connexión establecida con el servidor WebSocket.');
    console.log('Controles activos: Utilitza las teclas de flechas para moverte\'t. pulsa "q" para salir.');
    
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
        if (key.name === 'q') {
            console.log("\n👋 Has salido del juego.");
            ws.close();
            return;
        }

        let command = null;
        switch (key.name) {
            case 'up': command = 'up'; break;
            case 'down': command = 'down'; break;
            case 'left': command = 'left'; break;
            case 'right': command = 'right'; break;
        }

        if (command) {
            try {
                console.log(`Comando enviado ${command}`);
                ws.send(JSON.stringify({ command }));
            } catch (error) {
                console.error('Error:', error);
            }
        } else {
            displayPosition();
        }
    });
});

ws.on('message', (message) => {
    try {
        const data = JSON.parse(message.toString());
        process.stdout.write('\r' + ' '.repeat(process.stdout.columns) + '\r');

        switch (data.type) {
            case 'initialState':
                console.log('Estado inicial recibido.');
                currentPosition.x = data.x;
                currentPosition.y = data.y;
                break;
            case 'positionUpdate':
                currentPosition.x = data.x;
                currentPosition.y = data.y;
                break;
            case 'gameOver':
                console.log(`\nPARTIDA FINALIZADA (ID: ${data.gameId})`);
                console.log(`Distancia recorrida: ${data.distance}`);
                console.log(`Duración: ${new Date(data.startTime).toLocaleTimeString()} - ${new Date(data.endTime).toLocaleTimeString()}`);
                console.log('Muevete para iniciar una nueva partida');
                break;
            case 'error':
                console.warn(`Error: ${data.message}`);
                break;
            default:
                console.log('Mensaje no reconocido:', data);
        }
    } catch (error) {
        console.error('Error:', error);
        console.log('Mensaje recibido (raw):', message.toString());
    }
    displayPosition();
});

ws.on('close', (code, reason) => {
    try {
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
    } catch (e) {}
    console.log(`\nConexion cerrada. Codigo: ${code}. Motivo: ${reason?.toString() || 'no especificado'}`);
    process.exit(0);
});

ws.on('error', (error) => {
    try {
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
    } catch (e) {}
    console.error('Error de WebSocket:', error.message);
    if (error.code === 'ECONNREFUSED') {
        console.error(`No se ha establecido la conexion al servidor ${SERVER_URL}.`);
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\nInterrupción manual recibida (SIGINT). cerrando conexión...');
    ws.close();
});
