ALTER TABLE `Question`
  ADD COLUMN `examTrack` ENUM('RSC', 'ACS') NOT NULL DEFAULT 'RSC';

ALTER TABLE `Attempt`
  ADD COLUMN `examTrack` ENUM('RSC', 'ACS') NOT NULL DEFAULT 'RSC';

ALTER TABLE `CorrectAnswer`
  CHANGE COLUMN `correctLabel` `correctLabels` TEXT NOT NULL;

ALTER TABLE `AttemptAnswer`
  CHANGE COLUMN `selectedLabel` `selectedLabels` TEXT NULL;
