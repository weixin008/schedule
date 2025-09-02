# 邀请码功能实现计划

## 1. 功能概述

本功能旨在为用户注册流程添加邀请码验证机制，以控制用户注册数量、防止恶意注册或滥用。只有持有有效邀请码的用户才能完成注册。

**核心要求：**
*   邀请码必须是随机生成且不易被猜测的。
*   系统应提供生成邀请码的接口。
*   注册流程需集成邀请码的验证。

## 2. 受影响组件

*   **后端 (`schedule-api`)**：核心逻辑实现，包括邀请码管理、生成、验证及注册流程修改。
*   **前端 (`schedule-ui`)**：注册界面修改，以支持邀请码输入。

## 3. 后端 (`schedule-api`) 实现细节

### 3.1. 数据库设计

我们将创建一个新的实体 `InviteCode` 来管理邀请码。

**`InviteCode` 实体字段：**
*   `id` (Primary Key): 唯一标识符。
*   `code` (String, Unique): 邀请码字符串本身，例如 `ABC123XYZ`。
*   `used` (Boolean, Default: `false`): 标记邀请码是否已被使用。
*   `usedByUserId` (String, Nullable): 如果邀请码已被使用，记录使用该邀请码的用户 ID。
*   `createdAt` (Date): 邀请码的生成时间。
*   `usedAt` (Date, Nullable): 邀请码被使用的时间。

**`User` 实体修改：**
*   在 `User` 实体中添加 `role` (String/Enum) 字段，用于区分用户角色（例如 `USER`, `ADMIN`）。这将用于邀请码生成接口的权限控制。

### 3.2. 模块、服务与控制器

**a. `InviteCode` 模块 (`src/invite-code`)**

*   **`invite-code.module.ts`**: 导入 `TypeOrmModule.forFeature([InviteCode])`。
*   **`invite-code.service.ts`**: 核心业务逻辑。
    *   `generateRandomCode()`: 生成指定长度和字符集的随机邀请码字符串（例如，8-12位数字和大小写字母混合）。
    *   `createInviteCode(code: string)`: 将生成的邀请码保存到数据库。
    *   `validateInviteCode(code: string)`: 查找邀请码，检查其是否存在且未被使用。
    *   `markInviteCodeAsUsed(code: string, userId: string)`: 将邀请码标记为已使用，并记录使用用户和时间。
*   **`invite-code.controller.ts`**: 提供邀请码相关的 API 接口。
    *   `POST /api/invite-codes/generate`: 生成新的邀请码。
        *   **权限控制**：此接口必须受保护，只允许管理员角色访问。需要使用 NestJS 的 Guard 和 Decorator 来实现角色验证。
        *   **响应**：返回生成的邀请码字符串。

**b. `Auth` 模块 (`src/auth`) 修改**

*   **`auth.controller.ts`**: 修改注册接口的 DTO (Data Transfer Object)，使其包含 `inviteCode` 字段。
*   **`auth.service.ts`**: 修改注册逻辑。
    *   在创建新用户之前，调用 `InviteCodeService.validateInviteCode()` 来验证提供的邀请码。
    *   如果邀请码无效或已被使用，则抛出错误，拒绝注册。
    *   如果邀请码有效，则在用户注册成功后，调用 `InviteCodeService.markInviteCodeAsUsed()` 将邀请码标记为已使用。

### 3.3. 数据库迁移 (可选但推荐)

虽然 `synchronize: true` 在开发环境中会自动创建表，但对于生产环境，推荐使用 TypeORM 的迁移 (Migration) 功能来管理数据库 schema 的变更。

## 4. 前端 (`schedule-ui`) 实现细节

### 4.1. 注册页面修改

*   在现有的注册表单中，添加一个“邀请码”输入框。
*   该输入框应为必填项。

### 4.2. 注册逻辑修改

*   当用户提交注册表单时，确保将邀请码输入框的值作为 `inviteCode` 字段，与其他注册信息一同发送到后端 `POST /api/auth/register` 接口。
*   处理后端返回的错误信息，如果邀请码无效，则向用户显示相应的提示。

## 5. 安全考虑

*   **邀请码生成接口**：严格限制只有管理员才能访问。
*   **邀请码验证**：在后端进行严格的邀请码验证，包括是否存在、是否已使用、格式是否正确等。
*   **注册接口限流**：为注册接口添加速率限制，防止暴力破解邀请码或恶意注册。
*   **邀请码随机性**：确保邀请码生成算法的随机性足够高，长度足够，难以被猜测。

## 6. 未来增强

*   **邀请码有效期**：为邀请码设置过期时间。
*   **邀请码使用次数限制**：例如，一个邀请码只能使用一次，或者可以重复使用 N 次。
*   **邀请码管理界面**：为管理员提供一个界面，用于查看、生成、禁用邀请码。
*   **邀请码类型**：支持不同类型的邀请码（例如，普通用户邀请码、管理员邀请码）。
