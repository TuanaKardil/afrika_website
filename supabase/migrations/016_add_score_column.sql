-- Africa relevance score (1-10) assigned by ScorePipeline
ALTER TABLE articles ADD COLUMN IF NOT EXISTS score smallint CHECK (score BETWEEN 1 AND 10);
