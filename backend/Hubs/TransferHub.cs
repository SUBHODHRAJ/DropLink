using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace DropLink.Api.Hubs
{
    public class TransferHub : Hub
    {
        public async Task JoinSession(string sessionId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
        }

        public async Task LeaveSession(string sessionId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);
        }

        public async Task NotifyDevicePresence(string deviceName, string deviceType)
        {
            await Clients.Others.SendAsync("DeviceJoined", new
            {
                ConnectionId = Context.ConnectionId,
                DeviceName = deviceName,
                DeviceType = deviceType
            });
        }
    }
}
