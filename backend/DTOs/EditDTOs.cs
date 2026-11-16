namespace DropLink.Api.DTOs
{
    public class NoteDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? PlainText { get; set; }
        public string? Color { get; set; }
        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SaveNoteRequest
    {
        public string Title { get; set; } = "Untitled Note";
        public string Content { get; set; } = string.Empty;
        public string? PlainText { get; set; }
        public string? Color { get; set; } = "#38a9f6";
        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
    }

    public class DocumentDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? PlainText { get; set; }
        public int? FolderId { get; set; }
        public string? FolderName { get; set; }
        public bool IsFavorite { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SaveDocumentRequest
    {
        public string Title { get; set; } = "Untitled Document";
        public string Content { get; set; } = string.Empty;
        public string? PlainText { get; set; }
        public int? FolderId { get; set; }
        public bool IsFavorite { get; set; }
    }

    public class FolderDto
    {
        public int Id { get; set; }
        public string FolderName { get; set; } = string.Empty;
        public int? ParentFolderId { get; set; }
        public string? Color { get; set; }
        public int SubFolderCount { get; set; }
        public int FileCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateFolderRequest
    {
        public string FolderName { get; set; } = string.Empty;
        public int? ParentFolderId { get; set; }
        public string? Color { get; set; } = "#38a9f6";
    }

    public class ExportPdfRequest
    {
        public string Title { get; set; } = "Document";
        public string ContentHtml { get; set; } = string.Empty;
        public string? ContentJson { get; set; }
        public bool SaveToFiles { get; set; } = true;
    }
}
