namespace DropLink.Api.DTOs
{
    public class SubjectDto
    {
        public int Id { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string Semester { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Color { get; set; } = "#38a9f6";
        public string Icon { get; set; } = "BookOpen";
        public int NotesCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateSubjectRequest
    {
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string Semester { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Color { get; set; } = "#38a9f6";
        public string Icon { get; set; } = "BookOpen";
    }

    public class StudyFolderDto
    {
        public int Id { get; set; }
        public string FolderName { get; set; } = string.Empty;
        public int? ParentFolderId { get; set; }
        public int? SubjectId { get; set; }
        public string? UnitNumber { get; set; }
        public int NotesCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateStudyFolderRequest
    {
        public string FolderName { get; set; } = string.Empty;
        public int? ParentFolderId { get; set; }
        public int? SubjectId { get; set; }
        public string? UnitNumber { get; set; }
    }

    public class StudyNoteDto
    {
        public int Id { get; set; }
        public int? FolderId { get; set; }
        public string? FolderName { get; set; }
        public int? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public string? Semester { get; set; }
        public int FileId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string ClassificationStatus { get; set; } = "Organized";
        public string? SuggestedSubject { get; set; }
        public string? SuggestedUnit { get; set; }
        public double ConfidenceScore { get; set; }
        public bool IsFavorite { get; set; }
        public DateTime UploadedAt { get; set; }
        public DateTime? LastOpenedAt { get; set; }
    }

    public class SuggestedOrganizationDto
    {
        public int StudyNoteId { get; set; }
        public int FileId { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public string SuggestedTitle { get; set; } = string.Empty;
        public string? SuggestedSubject { get; set; }
        public string? SuggestedSemester { get; set; }
        public string? SuggestedUnit { get; set; }
        public double ConfidenceScore { get; set; }
        public string Reason { get; set; } = string.Empty;
        public List<string> ExtractedTopics { get; set; } = new List<string>();
    }

    public class ApproveOrganizationRequest
    {
        public List<ApproveItemDto> Items { get; set; } = new List<ApproveItemDto>();
    }

    public class ApproveItemDto
    {
        public int StudyNoteId { get; set; }
        public int? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public string? Semester { get; set; }
        public string? UnitNumber { get; set; }
        public string? NewDisplayName { get; set; }
    }

    public class BookmarkDto
    {
        public int Id { get; set; }
        public int StudyNoteId { get; set; }
        public int PageNumber { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class AnnotationDto
    {
        public int Id { get; set; }
        public int StudyNoteId { get; set; }
        public int PageNumber { get; set; }
        public string AnnotationType { get; set; } = "Highlight";
        public string AnnotationContent { get; set; } = string.Empty;
        public string Color { get; set; } = "#fef08a";
        public DateTime CreatedAt { get; set; }
    }

    public class SearchResultDto
    {
        public int StudyNoteId { get; set; }
        public int FileId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Semester { get; set; } = string.Empty;
        public string FolderPath { get; set; } = string.Empty;
        public string Snippet { get; set; } = string.Empty;
        public int? PageNumber { get; set; }
        public double MatchScore { get; set; }
    }

    public class AiStudyQueryRequest
    {
        public int? StudyNoteId { get; set; }
        public int? SubjectId { get; set; }
        public string QueryType { get; set; } = "Summary"; // Summary, Topics, Flashcards, Quiz, Explain
        public string? Prompt { get; set; }
    }

    public class AiStudyQueryResponse
    {
        public string QueryType { get; set; } = string.Empty;
        public string ResultText { get; set; } = string.Empty;
        public List<string> KeyPoints { get; set; } = new List<string>();
        public List<FlashcardDto> Flashcards { get; set; } = new List<FlashcardDto>();
        public List<string> Sources { get; set; } = new List<string>();
    }

    public class FlashcardDto
    {
        public string Question { get; set; } = string.Empty;
        public string Answer { get; set; } = string.Empty;
        public string Topic { get; set; } = string.Empty;
    }
}
