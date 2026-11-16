using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using DropLink.Api.DTOs;
using QRCoder;

namespace DropLink.Api.Services
{
    public interface ILanDiscoveryService
    {
        string GetLocalIpAddress();
        string GetPairingPin();
        string RefreshPairingPin();
        bool VerifyPairingPin(string pin);
        LanServerStatusDto GetServerStatus(int port = 5000);
        string GenerateQrCodeBase64(string content);
    }

    public class LanDiscoveryService : ILanDiscoveryService
    {
        private static string _currentPin = new Random().Next(100000, 999999).ToString();
        private static DateTime _pinCreatedAt = DateTime.UtcNow;

        public string GetLocalIpAddress()
        {
            try
            {
                // First attempt: Connect socket to a standard LAN address to find outbound route
                using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0);
                socket.Connect("8.8.8.8", 65530);
                if (socket.LocalEndPoint is IPEndPoint endPoint)
                {
                    return endPoint.Address.ToString();
                }
            }
            catch
            {
                // Fallback: Scan active operational network interfaces
            }

            try
            {
                var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                    .Where(n => n.OperationalStatus == OperationalStatus.Up &&
                                n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                    .OrderByDescending(n => n.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 ||
                                            n.NetworkInterfaceType == NetworkInterfaceType.Ethernet);

                foreach (var netInterface in interfaces)
                {
                    var props = netInterface.GetIPProperties();
                    var unicast = props.UnicastAddresses
                        .FirstOrDefault(u => u.Address.AddressFamily == AddressFamily.InterNetwork &&
                                            !IPAddress.IsLoopback(u.Address));
                    if (unicast != null)
                    {
                        return unicast.Address.ToString();
                    }
                }
            }
            catch
            {
            }

            return "127.0.0.1";
        }

        public string GetPairingPin()
        {
            // PIN expires every 6 hours or on refresh
            if (DateTime.UtcNow - _pinCreatedAt > TimeSpan.FromHours(6))
            {
                RefreshPairingPin();
            }
            return _currentPin;
        }

        public string RefreshPairingPin()
        {
            _currentPin = new Random().Next(100000, 999999).ToString();
            _pinCreatedAt = DateTime.UtcNow;
            return _currentPin;
        }

        public bool VerifyPairingPin(string pin)
        {
            if (string.IsNullOrWhiteSpace(pin)) return false;
            return string.Equals(_currentPin.Trim(), pin.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        public string GenerateQrCodeBase64(string content)
        {
            try
            {
                using var qrGenerator = new QRCodeGenerator();
                using var qrCodeData = qrGenerator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
                using var qrCode = new PngByteQRCode(qrCodeData);
                byte[] qrCodeBytes = qrCode.GetGraphic(20);
                return $"data:image/png;base64,{Convert.ToBase64String(qrCodeBytes)}";
            }
            catch
            {
                return string.Empty;
            }
        }

        public LanServerStatusDto GetServerStatus(int port = 5000)
        {
            var ip = GetLocalIpAddress();
            var pin = GetPairingPin();
            var lanUrl = $"http://{ip}:{port}";
            var mobilePortalUrl = $"{lanUrl}/#/mobile-share?pin={pin}&host={ip}:{port}";
            var qrCode = GenerateQrCodeBase64(mobilePortalUrl);

            return new LanServerStatusDto
            {
                LocalIp = ip,
                Port = port,
                LanUrl = lanUrl,
                PairingPin = pin,
                QrCodeBase64 = qrCode,
                ConnectedDevicesCount = 0
            };
        }
    }
}
