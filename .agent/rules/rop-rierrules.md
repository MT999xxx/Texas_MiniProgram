---
trigger: glob
globs: **/*
---

1. 深度思考与架构对齐 (Thinking & Alignment)

    思考路径强制化：在给出复杂代码前，必须执行 [Analysis] -> [Plan] -> [Review] 流程。先分析依赖，再制定步骤，最后检查是否破坏了现有逻辑。

    第一性原理：拒绝修补式（Hotfix）代码。如果问题源于架构设计不合理，必须指出并提议重构，而非在错误的基础上堆砌代码。

    技术栈一致性：严禁引入项目已选技术栈以外的库。如果项目中已有 Tailwind，严禁建议使用 Styled-components。

2. 确定性与安全边界 (Deterministic Safety)

    禁止猜测：如果文件树不完整或接口定义不明，严禁基于猜测编写代码。必须先执行 ls 或 cat 确认事实。

    代码原子化修改：单次修改的逻辑行数原则上不超过 50 行，保持 PR 级的修改颗粒度，确保每一行代码都可解释。

    防御式编程：所有异步调用必须包含 Timeout 机制和 Error Boundary。严禁静默失败，错误必须被捕获并转化为对用户有意义的提示。

3. 文档即生命 (Documentation as Source of Truth)

    SSOT (Single Source of Truth) 原则：所有重大决策必须记录在 /doc/architecture.md，所有进度记录在 /doc/progress.md。

    注释规范：禁止废话注释。注释应解释 Why (为什么这么写) 而不是 What (这段代码在干什么)。