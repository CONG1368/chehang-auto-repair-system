import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局前缀
  app.setGlobalPrefix('api');

  // 跨域 — 生产环境通过 CORS_ORIGINS 环境变量配置（逗号分隔）
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:8080')
    .split(',')
    .map((s) => s.trim());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局响应拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  const server = await app.listen(process.env.APP_PORT || 3000);
  console.log(`🚀 ${process.env.APP_NAME} 已启动: http://localhost:${process.env.APP_PORT}`);
  console.log(`📖 API文档: http://localhost:${process.env.APP_PORT}/api`);

  // 优雅关闭
  const signals = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`收到 ${signal} 信号，正在关闭服务...`);
      await app.close();
      process.exit(0);
    });
  }
}
bootstrap();
