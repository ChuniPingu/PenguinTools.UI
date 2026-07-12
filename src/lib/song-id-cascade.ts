const SONG_ID_OFFSET = 1_000_000;

export function applySongIdCascade(
  previousSongId: number | null | undefined,
  nextSongId: number | null | undefined,
  stageId: string,
  unlockEventId: string,
): { stageId: string; unlockEventId: string } {
  if (previousSongId == null || nextSongId == null) {
    return { stageId, unlockEventId };
  }

  const result = { stageId, unlockEventId };
  const parsedStageId = stageId.trim() ? Number(stageId) : null;
  const parsedUnlockEventId = unlockEventId.trim() ? Number(unlockEventId) : null;

  if (parsedStageId != null && parsedStageId - SONG_ID_OFFSET === previousSongId) {
    result.stageId = String(nextSongId + SONG_ID_OFFSET);
  }
  if (parsedUnlockEventId != null && parsedUnlockEventId - SONG_ID_OFFSET === previousSongId) {
    result.unlockEventId = String(nextSongId + SONG_ID_OFFSET);
  }

  return result;
}
