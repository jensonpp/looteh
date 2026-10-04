// Quest + achievement definitions. Definitions live in code (not the DB) so
// they version with the deploy; only per-user progress/earn state is stored.

export type QuestDef = {
  key: string
  title: string
  description: string
  target: number
  gemsReward: number
}

export const DAILY_QUESTS: QuestDef[] = [
  {
    key: 'earn_30_xp',
    title: 'Earn 30 XP',
    description: 'Complete exercises and lessons to bank XP',
    target: 30,
    gemsReward: 10,
  },
  {
    key: 'answer_10_correct',
    title: 'Answer 10 questions correctly',
    description: 'Correct answers in lessons count toward this quest',
    target: 10,
    gemsReward: 10,
  },
  {
    key: 'finish_1_lesson',
    title: 'Finish 1 lesson',
    description: 'Complete any lesson from the path',
    target: 1,
    gemsReward: 15,
  },
]

export type AchievementDef = {
  key: string
  title: string
  description: string
  gemsReward: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_lesson', title: 'First Steps', description: 'Complete your first lesson', gemsReward: 20 },
  { key: 'perfect_lesson', title: 'Flawless', description: 'Complete a lesson with a 100% score', gemsReward: 30 },
  { key: 'five_lessons', title: 'Getting Serious', description: 'Complete 5 lessons', gemsReward: 30 },
  { key: 'unit_champion', title: 'Unit Champion', description: 'Complete every lesson in a unit', gemsReward: 50 },
  { key: 'streak_7', title: 'On Fire', description: 'Reach a 7-day streak', gemsReward: 50 },
  { key: 'xp_500', title: 'XP Collector', description: 'Earn 500 total XP', gemsReward: 50 },
  { key: 'quest_master', title: 'Quest Master', description: 'Claim 10 daily quests', gemsReward: 30 },
]

export const GEM_COSTS = {
  streakFreeze: 30,
  heartRefill: 20,
} as const

export const MAX_STREAK_FREEZES = 2