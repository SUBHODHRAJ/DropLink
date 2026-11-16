using System.Collections.Generic;
using System.Threading.Tasks;
using DropLink.Api.DTOs;

namespace DropLink.Api.Services
{
    public interface ISmartOrganizationService
    {
        Task<SuggestedOrganizationDto> AnalyzeDocumentAsync(int studyNoteId);
        Task<List<SuggestedOrganizationDto>> AnalyzePendingNotesAsync(int? userId);
        Task<bool> ApplyOrganizationAsync(ApproveOrganizationRequest request, int? userId);
    }
}
