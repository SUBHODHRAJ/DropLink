import * as signalR from '@microsoft/signalr';

let hubConnection = null;

export const getSignalRConnection = () => {
  if (!hubConnection) {
    const token = localStorage.getItem('droplink_token') || '';
    const rawApiUrl = import.meta.env.VITE_API_URL || '';
    const hostBase = rawApiUrl ? rawApiUrl.replace(/\/api\/?$/, '') : '';
    const hubUrl = `${hostBase}/hub/transfer`;

    hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }

  return hubConnection;
};

export const startSignalR = async () => {
  const conn = getSignalRConnection();
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    try {
      await conn.start();
      console.log('SignalR TransferHub connected successfully.');
    } catch (err) {
      console.warn('SignalR connection failed, will retry automatically:', err);
    }
  }
  return conn;
};
