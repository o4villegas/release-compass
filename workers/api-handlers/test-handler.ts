// TEST: Verify we can import this from app/routes/

export async function testHandler(db: D1Database): Promise<{ message: string; count: number }> {
  const result = await db.prepare("SELECT COUNT(*) as count FROM projects").first();

  return {
    message: "Handler function works!",
    count: (result?.count as number) || 0
  };
}
