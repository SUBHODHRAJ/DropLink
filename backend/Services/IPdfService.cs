using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace DropLink.Api.Services
{
    public interface IPdfService
    {
        Task<byte[]> GeneratePdfFromDocumentAsync(string title, string contentHtml, string? plainText = null);
        Task<byte[]> GeneratePdfFromImagesAsync(List<string> imagePaths, string title);
        (string ExtractedText, int PageCount, Dictionary<string, string> Metadata) ExtractTextAndMetadata(string pdfFilePath);
        Task<byte[]> MergePdfsAsync(List<string> pdfFilePaths);
    }
}
