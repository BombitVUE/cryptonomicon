/* eslint-disable prettier/prettier */

const API_KEY =
  "9ba7dfbeea00e50c78cdc94c304170eeb362edc25e2d8fe6c3e25bb82bd57c2b";

const tickersHandlers = new Map();
let socket = null;
const AGGREGATE_INDEX = "5";

function connectWebSocket() {
  socket = new WebSocket(
    `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
  );

  socket.addEventListener("open", () => {
    // При успішному підключенні WebSocket
    console.log("WebSocket connection established");
    // Відновлення всіх підписок
    tickersHandlers.forEach((handlers, ticker) => {
      subscribeToTickerOnWs(ticker);
    });
  });

  socket.addEventListener("close", () => {
    // При обриві зв'язку WebSocket
    console.log("WebSocket connection closed. Reconnecting...");
    // Повторне підключення через 5 секунд
    setTimeout(connectWebSocket, 5000);
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    const { TYPE: type, FROMSYMBOL: currency, PRICE: newPrice } = message;

    if (type === AGGREGATE_INDEX && newPrice !== undefined) {
      handlePriceUpdate(currency, newPrice);
    }
  });
}

function handlePriceUpdate(currency, newPrice) {
  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach((fn) => fn(newPrice));
}

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}

function subscribeToTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
}

function unsubscribeFromTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker);
};

// Підключення WebSocket при запуску додатка
connectWebSocket();

window.ticker = tickersHandlers;
