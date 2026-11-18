CREATE DATABASE Skillora;
GO

USE Skillora;
GO

CREATE TABLE Users (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL DEFAULT 'Student',
    ProfileImage NVARCHAR(500) NULL,
    Bio NVARCHAR(MAX) NULL,
    University NVARCHAR(150) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsActive BIT NOT NULL DEFAULT 1
);

CREATE TABLE Skills (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    SkillName NVARCHAR(100) NOT NULL UNIQUE,
    Category NVARCHAR(50) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1
);

CREATE TABLE UserSkills (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    SkillID INT NOT NULL,
    SkillType NVARCHAR(10) NOT NULL,
    CONSTRAINT FK_UserSkills_User FOREIGN KEY (UserID) REFERENCES Users(ID),
    CONSTRAINT FK_UserSkills_Skill FOREIGN KEY (SkillID) REFERENCES Skills(ID),
    CONSTRAINT CK_UserSkills_Type CHECK (SkillType IN ('Teach', 'Learn')),
    CONSTRAINT UQ_UserSkills UNIQUE (UserID, SkillID, SkillType)
);

CREATE TABLE ExchangeRequests (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    SenderID INT NOT NULL,
    ReceiverID INT NOT NULL,
    OfferedSkillID INT NOT NULL,
    RequestedSkillID INT NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Requests_Sender FOREIGN KEY (SenderID) REFERENCES Users(ID),
    CONSTRAINT FK_Requests_Receiver FOREIGN KEY (ReceiverID) REFERENCES Users(ID),
    CONSTRAINT FK_Requests_Offered FOREIGN KEY (OfferedSkillID) REFERENCES Skills(ID),
    CONSTRAINT FK_Requests_Requested FOREIGN KEY (RequestedSkillID) REFERENCES Skills(ID),
    CONSTRAINT CK_Requests_Status CHECK (Status IN ('Pending', 'Accepted', 'Rejected', 'Cancelled', 'Completed'))
);

CREATE TABLE Reviews (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    RequestID INT NOT NULL,
    ReviewerID INT NOT NULL,
    ReviewedUserID INT NOT NULL,
    Rating INT NOT NULL,
    Comment NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Reviews_Request FOREIGN KEY (RequestID) REFERENCES ExchangeRequests(ID),
    CONSTRAINT FK_Reviews_Reviewer FOREIGN KEY (ReviewerID) REFERENCES Users(ID),
    CONSTRAINT FK_Reviews_User FOREIGN KEY (ReviewedUserID) REFERENCES Users(ID),
    CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 5)
);

CREATE TABLE ActivityLogs (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NULL,
    Action NVARCHAR(100) NOT NULL,
    Details NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Activity_User FOREIGN KEY (UserID) REFERENCES Users(ID)
);

CREATE INDEX IX_UserSkills_User ON UserSkills(UserID);
CREATE INDEX IX_ExchangeRequests_Receiver ON ExchangeRequests(ReceiverID, Status);
CREATE INDEX IX_Reviews_ReviewedUser ON Reviews(ReviewedUserID);
