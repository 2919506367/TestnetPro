import { prisma } from "@/lib/db";

async function main() {
  console.log("=== 修复 AI 模型配置 ===\n");

  // 查找并禁用有问题的 MiMo-V2.5-Pro 模型
  const problematicProvider = await prisma.aiProvider.findFirst({
    where: { model: "MiMo-V2.5-Pro" },
  });

  if (problematicProvider) {
    console.log(`找到有问题的模型: ${problematicProvider.name} (ID: ${problematicProvider.id})`);
    await prisma.aiProvider.update({
      where: { id: problematicProvider.id },
      data: { isActive: false },
    });
    console.log("已禁用该模型");
  } else {
    console.log("未找到 MiMo-V2.5-Pro 模型");
  }

  // 显示当前激活的模型
  const activeProviders = await prisma.aiProvider.findMany({
    where: { isActive: true },
  });

  console.log(`\n当前激活的模型 (${activeProviders.length} 个):`);
  activeProviders.forEach((p) => {
    console.log(`- ${p.name}: ${p.model}`);
  });

  console.log("\n=== 修复完成 ===");
  await prisma.$disconnect();
}

main().catch(console.error);
