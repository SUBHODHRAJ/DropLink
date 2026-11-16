using System.IO;
using System.Threading.Tasks;

namespace DropLink.Api.Services
{
    public interface IStorageService
    {
        string GetStorageRoot();
        string GetTempRoot();
        Task<string> SaveChunkAsync(string sessionId, int chunkIndex, Stream chunkStream);
        Task<string> AssembleChunksAsync(string sessionId, string targetFileName, int totalChunks, string? expectedChecksum = null);
        Task<string> SaveDirectFileAsync(string fileName, Stream fileStream);
        FileStream? GetFileStream(string relativePath);
        Task<bool> DeleteFileAsync(string relativePath);
        bool CheckAvailableDiskSpace(long requiredBytes);
        Task<string> CalculateChecksumAsync(string filePath);
    }
}
