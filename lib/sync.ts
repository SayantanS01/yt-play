import prisma from "./prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export const syncUser = async () => {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  // MOCK USER for debugging
  if (!user || !user.id || !user.email) {
    const mockId = "mock_debug_user_123";
    const mockUser = await prisma.user.findUnique({
      where: { id: mockId },
      include: { stats: true },
    });

    if (!mockUser) {
      return await prisma.user.create({
        data: {
          id: mockId,
          email: "debug-guest@mediahub.local",
          name: "Guest Debugger",
          role: "USER",
          stats: {
            create: {
              totalYoutubeLinks: 0,
              totalVideosDownloaded: 0,
              totalMP3Downloaded: 0,
              topChannels: "[]",
            },
          },
        },
        include: { stats: true },
      });
    }
    return mockUser;
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { stats: true },
  });

  if (!existingUser) {
    const newUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: `${user.given_name || ""} ${user.family_name || ""}`.trim(),
        role: "USER",
        stats: {
          create: {
            totalYoutubeLinks: 0,
            totalVideosDownloaded: 0,
            totalMP3Downloaded: 0,
            topChannels: "[]",
          },
        },
      },
      include: { stats: true },
    });
    return newUser;
  }

  return existingUser;
};
