using Microsoft.EntityFrameworkCore;
using DropLink.Api.Models;

namespace DropLink.Api.Data
{
    public class DropLinkDbContext : DbContext
    {
        public DropLinkDbContext(DbContextOptions<DropLinkDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Device> Devices => Set<Device>();
        public DbSet<FileItem> Files => Set<FileItem>();
        public DbSet<Folder> Folders => Set<Folder>();
        public DbSet<Note> Notes => Set<Note>();
        public DbSet<Document> Documents => Set<Document>();
        public DbSet<Subject> Subjects => Set<Subject>();
        public DbSet<StudyFolder> StudyFolders => Set<StudyFolder>();
        public DbSet<StudyNote> StudyNotes => Set<StudyNote>();
        public DbSet<SharedLink> SharedLinks => Set<SharedLink>();
        public DbSet<UploadSession> UploadSessions => Set<UploadSession>();
        public DbSet<Transfer> Transfers => Set<Transfer>();
        public DbSet<Bookmark> Bookmarks => Set<Bookmark>();
        public DbSet<Annotation> Annotations => Set<Annotation>();
        public DbSet<DocumentTopic> DocumentTopics => Set<DocumentTopic>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Username).IsUnique();
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Username).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
            });

            // Device configuration
            modelBuilder.Entity<Device>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.DeviceIdentifier);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.Devices)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // FileItem configuration
            modelBuilder.Entity<FileItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Checksum);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.FileCategory);
                entity.Property(e => e.FileName).HasMaxLength(255).IsRequired();
                entity.Property(e => e.OriginalFileName).HasMaxLength(255).IsRequired();
                entity.Property(e => e.StoragePath).HasMaxLength(1024).IsRequired();
                entity.Property(e => e.Checksum).HasMaxLength(64);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Files)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Folder)
                    .WithMany(f => f.Files)
                    .HasForeignKey(e => e.FolderId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Folder configuration
            modelBuilder.Entity<Folder>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.Folders)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.ParentFolder)
                    .WithMany(f => f.SubFolders)
                    .HasForeignKey(e => e.ParentFolderId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Note configuration
            modelBuilder.Entity<Note>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).HasMaxLength(255);
                entity.Property(e => e.Content).HasColumnType("longtext");
                entity.Property(e => e.PlainText).HasColumnType("longtext");

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Notes)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Document configuration
            modelBuilder.Entity<Document>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).HasMaxLength(255);
                entity.Property(e => e.Content).HasColumnType("longtext");
                entity.Property(e => e.PlainText).HasColumnType("longtext");

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Documents)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Folder)
                    .WithMany(f => f.Documents)
                    .HasForeignKey(e => e.FolderId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Subject configuration
            modelBuilder.Entity<Subject>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SubjectName).HasMaxLength(255).IsRequired();
                entity.Property(e => e.SubjectCode).HasMaxLength(50);
                entity.Property(e => e.Semester).HasMaxLength(50);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Subjects)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // StudyFolder configuration
            modelBuilder.Entity<StudyFolder>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FolderName).HasMaxLength(255).IsRequired();

                entity.HasOne(e => e.Subject)
                    .WithMany(s => s.StudyFolders)
                    .HasForeignKey(e => e.SubjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.ParentFolder)
                    .WithMany(f => f.SubFolders)
                    .HasForeignKey(e => e.ParentFolderId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // StudyNote configuration
            modelBuilder.Entity<StudyNote>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.DisplayName).HasMaxLength(255).IsRequired();
                entity.Property(e => e.ExtractedText).HasColumnType("longtext");

                entity.HasOne(e => e.File)
                    .WithMany(f => f.StudyNotes)
                    .HasForeignKey(e => e.FileId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Folder)
                    .WithMany(f => f.StudyNotes)
                    .HasForeignKey(e => e.FolderId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Subject)
                    .WithMany()
                    .HasForeignKey(e => e.SubjectId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // SharedLink configuration
            modelBuilder.Entity<SharedLink>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.PublicToken).IsUnique();
                entity.Property(e => e.PublicToken).HasMaxLength(64).IsRequired();

                entity.HasOne(e => e.User)
                    .WithMany(u => u.SharedLinks)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.File)
                    .WithMany(f => f.SharedLinks)
                    .HasForeignKey(e => e.FileId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // UploadSession configuration
            modelBuilder.Entity<UploadSession>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.SessionId).IsUnique();
                entity.Property(e => e.SessionId).HasMaxLength(64).IsRequired();
                entity.Property(e => e.FileName).HasMaxLength(255).IsRequired();
                entity.Property(e => e.TempDirectory).HasMaxLength(1024);
            });

            // Bookmark configuration
            modelBuilder.Entity<Bookmark>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.StudyNote)
                    .WithMany(s => s.Bookmarks)
                    .HasForeignKey(e => e.StudyNoteId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Annotation configuration
            modelBuilder.Entity<Annotation>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.AnnotationContent).HasColumnType("text");
                entity.HasOne(e => e.StudyNote)
                    .WithMany(s => s.Annotations)
                    .HasForeignKey(e => e.StudyNoteId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // DocumentTopic configuration
            modelBuilder.Entity<DocumentTopic>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TopicName).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Keywords).HasMaxLength(1024);
                entity.HasOne(e => e.StudyNote)
                    .WithMany(s => s.Topics)
                    .HasForeignKey(e => e.StudyNoteId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
