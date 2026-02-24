# AI 提示词：资源放置与职责说明

目的
- 仅说明“各类资源应放在哪里”和“层级职责”，不包含具体业务或服务示例。

目录与职责
- 入口
  - bin/imhere.ts：应用入口，创建 App 与 Stack，设置 env 与合成器。
- 函数代码
  - bin/lambda/{名称}/index.js：函数实现代码目录；每个函数（或服务）独立文件夹存放源码。
- 构造层
  - lib/constructs/{名称}-{类型}.ts：将同类云资源封装为可复用构造（如 *-function、*-api、*-table 等），对外暴露关键属性（如 fn、api、table）。
- 堆栈层
  - lib/stack/{堆栈名}.ts：仅负责实例化多个构造、维护依赖关系（先资源后网关等），并通过 CfnOutput 输出关键信息（URL/ARN/Name）。
- 配置
  - cdk.json / package.json / tsconfig.json：工程与 CDK 配置。

放置规则
- Lambda：实现代码放在 bin/lambda/{名称}/ 下；对应在 lib/constructs/ 中创建 *-function 构造封装配置并导出函数实例。
- API Gateway：在 lib/constructs/ 中创建 *-api 构造，管理路由、方法与后端集成；对外暴露网关与必要的 URL。
- 其他资源（如表、队列、主题、密钥等）：遵循同样模式在 lib/constructs/ 封装，集中管理最小可复用单元。
- Stack：只做“装配与输出”，不直接内联资源细节；新增依赖或路由时，通过装配已有构造完成。

命名约定
- 构造文件：{名称}-{类型}.ts（例如 account-function.ts、audit-table.ts）。
- 构造类名：PascalCase，文件中导出单一主要构造。
- 输出：以 CfnOutput 输出 URL、ARN 等关键引用，便于集成与排查。

通用提示词模板（无业务内容）
- “在本仓库内，新增一个 {资源类型} 的构造文件到 lib/constructs/{name}-{type}.ts；如涉及函数，将实现代码放到 bin/lambda/{name}/ 下；在 lib/stack/{stack}.ts 中装配新构造与既有构造的依赖，并以 CfnOutput 输出关键引用（URL/ARN/Name）。保持现有目录与命名规范。”

发布命令
- Web 发布
  - 快速发布：npm run web:deploy
  - 手动同步静态：npm run site:sync
  - 查看 API 基础地址：npm run site:url
- 后端发布（Lambda/CDK）
  - 部署全部：npm run deploy（若未设置，将自动默认 AWS_PROFILE=dam，AWS_REGION=ap-east-1，并在部署前调用 aws sts get-caller-identity 校验凭据）
  - 构建并部署 Layer：npm run layer:deploy
  - 查看变更：npm run diff
