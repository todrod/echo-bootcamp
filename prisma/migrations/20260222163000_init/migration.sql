CREATE TABLE `User` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(64) NOT NULL,
  `passwordHash` TEXT NOT NULL,
  `isAdmin` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `User_username_key`(`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Question` (
  `id` INTEGER NOT NULL,
  `stem` TEXT NOT NULL,
  `explanation` TEXT NULL,
  `category` ENUM('A', 'B', 'C', 'D', 'E') NULL,
  `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NULL,
  `tagConfidence` DOUBLE NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Choice` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `questionId` INTEGER NOT NULL,
  `label` VARCHAR(1) NOT NULL,
  `text` TEXT NOT NULL,
  UNIQUE INDEX `Choice_questionId_label_key`(`questionId`, `label`),
  INDEX `Choice_questionId_idx`(`questionId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CorrectAnswer` (
  `questionId` INTEGER NOT NULL,
  `correctLabel` VARCHAR(1) NOT NULL,
  PRIMARY KEY (`questionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Tag` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  UNIQUE INDEX `Tag_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `QuestionTag` (
  `questionId` INTEGER NOT NULL,
  `tagId` INTEGER NOT NULL,
  `confidence` DOUBLE NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `QuestionTag_tagId_idx`(`tagId`),
  PRIMARY KEY (`questionId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Weight` (
  `categoryCode` ENUM('A', 'B', 'C', 'D', 'E') NOT NULL,
  `weight` DOUBLE NOT NULL,
  PRIMARY KEY (`categoryCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Attempt` (
  `id` VARCHAR(191) NOT NULL,
  `userId` INTEGER NOT NULL,
  `mode` ENUM('FULL', 'PRACTICE') NOT NULL,
  `totalQuestions` INTEGER NOT NULL,
  `timed` BOOLEAN NOT NULL,
  `timeLimitMinutes` INTEGER NULL,
  `status` ENUM('IN_PROGRESS', 'FINISHED', 'EXPIRED') NOT NULL DEFAULT 'IN_PROGRESS',
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt` DATETIME(3) NULL,
  `lastSeenAt` DATETIME(3) NULL,
  `lastViewedQuestionIndex` INTEGER NOT NULL DEFAULT 0,
  `useWeighting` BOOLEAN NOT NULL DEFAULT true,
  `categoriesJson` TEXT NULL,
  INDEX `Attempt_userId_status_idx`(`userId`, `status`),
  INDEX `Attempt_startedAt_idx`(`startedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AttemptQuestion` (
  `attemptId` VARCHAR(191) NOT NULL,
  `questionId` INTEGER NOT NULL,
  `orderIndex` INTEGER NOT NULL,
  UNIQUE INDEX `AttemptQuestion_attemptId_orderIndex_key`(`attemptId`, `orderIndex`),
  INDEX `AttemptQuestion_questionId_idx`(`questionId`),
  PRIMARY KEY (`attemptId`, `questionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AttemptAnswer` (
  `attemptId` VARCHAR(191) NOT NULL,
  `questionId` INTEGER NOT NULL,
  `selectedLabel` VARCHAR(1) NULL,
  `isCorrect` BOOLEAN NULL,
  `markedForReview` BOOLEAN NOT NULL DEFAULT false,
  `answeredAt` DATETIME(3) NULL,
  INDEX `AttemptAnswer_questionId_idx`(`questionId`),
  PRIMARY KEY (`attemptId`, `questionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Choice` ADD CONSTRAINT `Choice_questionId_fkey`
  FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CorrectAnswer` ADD CONSTRAINT `CorrectAnswer_questionId_fkey`
  FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `QuestionTag` ADD CONSTRAINT `QuestionTag_questionId_fkey`
  FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `QuestionTag` ADD CONSTRAINT `QuestionTag_tagId_fkey`
  FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AttemptQuestion` ADD CONSTRAINT `AttemptQuestion_attemptId_fkey`
  FOREIGN KEY (`attemptId`) REFERENCES `Attempt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AttemptQuestion` ADD CONSTRAINT `AttemptQuestion_questionId_fkey`
  FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AttemptAnswer` ADD CONSTRAINT `AttemptAnswer_attemptId_fkey`
  FOREIGN KEY (`attemptId`) REFERENCES `Attempt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AttemptAnswer` ADD CONSTRAINT `AttemptAnswer_questionId_fkey`
  FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `Weight` (`categoryCode`, `weight`) VALUES
('A', 0.10),
('B', 0.25),
('C', 0.20),
('D', 0.30),
('E', 0.15);
