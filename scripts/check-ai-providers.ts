import { prisma } from "@/lib/db";

async function main() {
  console.log("=== 检查 AI 模型配置 ===\n");

  const providers = await prisma.aiProvider.findMany();
  console.log(`找到 ${providers.length} 个 AI 模型配置：\n`);

  providers.forEach((p) => {
    console.log(`ID: ${p.id}`);
    console.log(`名称: ${p.name}`);
    console.log(`模型: ${p.model}`);
    console.log(`API URL: ${p.apiUrl}`);
    console.log(`激活状态: ${p.isActive}`);
    console.log("---");
  });

  console.log("\n=== 结束 ===");
  await prisma.$disconnect();
}

main().catch(console.error);
