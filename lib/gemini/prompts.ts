import {
  GeminiError,
  type PromptTemplateConfig,
  type ResolvedPromptTemplate,
} from "./types.ts";

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

const BUILTIN_TEMPLATES: PromptTemplateConfig[] = [
  {
    id: "summarize",
    description: "문서나 긴 텍스트를 지정한 스타일로 요약합니다.",
    systemInstruction:
      "당신은 핵심 정보를 정확하고 간결하게 추려내는 전문 요약 어시스턴트입니다. 원문에 없는 사실을 지어내지 마세요.",
    template:
      "다음 텍스트를 '{{style}}' 형식에 맞춰 한국어로 요약해 주세요.\n\n---\n{{content}}",
    defaultConfig: {
      temperature: 0.3,
    },
  },
  {
    id: "translate",
    description: "텍스트를 자연스러운 목표 언어로 번역합니다.",
    systemInstruction:
      "당신은 전문 번역가입니다. 원문의 뉘앙스와 문맥을 유지하면서 목표 언어로 자연스럽게 번역 결과만 출력하세요.",
    template:
      "다음 텍스트를 {{targetLanguage}}(으)로 번역해 주세요:\n\n{{text}}",
    defaultConfig: {
      temperature: 0.2,
    },
  },
  {
    id: "code-review",
    description: "코드의 버그, 보안 취약점, 성능 및 가독성 개선점을 리뷰합니다.",
    systemInstruction:
      "당신은 시니어 소프트웨어 엔지니어입니다. 문제점의 원인과 구체적인 개선 코드 예시를 함께 제시하세요.",
    template:
      "언어/환경: {{language}}\n\n아래 코드를 검토하고 버그, 보안 이슈, 개선 제안을 정리해 주세요:\n\n```{{language}}\n{{code}}\n```",
    defaultConfig: {
      temperature: 0.2,
    },
  },
  {
    id: "media-analyzer",
    description: "첨부된 이미지나 문서를 주어진 분석 관점에 따라 설명/추출합니다.",
    systemInstruction:
      "당신은 멀티모달 데이터 분석 어시스턴트입니다. 첨부된 이미지·문서의 시각적/텍스트 정보를 정확히 파악하여 답변하세요.",
    template:
      "첨부된 파일을 다음 관점에 집중하여 분석해 주세요: {{focus}}",
    defaultConfig: {
      temperature: 0.4,
    },
  },
];

const templateRegistry = new Map<string, PromptTemplateConfig>(
  BUILTIN_TEMPLATES.map((tpl) => [tpl.id, tpl])
);

/**
 * Extracts all unique `{{variable}}` names from a template string.
 */
export function extractTemplateVariables(templateString: string): string[] {
  const vars = new Set<string>();
  for (const match of templateString.matchAll(VARIABLE_PATTERN)) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}

/**
 * Replaces `{{variable}}` placeholders in a prompt string and validates that
 * all required variables are provided.
 */
export function renderPromptString(
  templateString: string,
  variables: Record<string, string | number | boolean> = {}
): string {
  const requiredVars = extractTemplateVariables(templateString);
  const missingVars = requiredVars.filter(
    (key) =>
      !(key in variables) ||
      variables[key] === undefined ||
      variables[key] === null ||
      String(variables[key]).trim() === ""
  );

  if (missingVars.length > 0) {
    throw new GeminiError(
      "VALIDATION_ERROR",
      `프롬프트 템플릿 필수 변수가 누락되었습니다: ${missingVars.join(", ")}`,
      400,
      { missingVariables: missingVars }
    );
  }

  return templateString.replace(VARIABLE_PATTERN, (_, key: string) =>
    String(variables[key])
  );
}

/**
 * Registers or updates a prompt template in the server registry.
 */
export function registerPromptTemplate(config: PromptTemplateConfig): void {
  if (!config.id?.trim() || !config.template?.trim()) {
    throw new GeminiError(
      "VALIDATION_ERROR",
      "프롬프트 템플릿 등록 시 id와 template는 필수입니다.",
      400
    );
  }
  templateRegistry.set(config.id, config);
}

/**
 * Lists all registered prompt templates with their required variables.
 */
export function listPromptTemplates(): Array<
  PromptTemplateConfig & { requiredVariables: string[] }
> {
  return Array.from(templateRegistry.values()).map((tpl) => ({
    ...tpl,
    requiredVariables: extractTemplateVariables(tpl.template),
  }));
}

/**
 * Looks up a template by ID and interpolates variables.
 */
export function resolvePromptTemplate(
  templateId: string,
  variables: Record<string, string | number | boolean> = {}
): ResolvedPromptTemplate {
  const config = templateRegistry.get(templateId);

  if (!config) {
    throw new GeminiError(
      "TEMPLATE_NOT_FOUND",
      `등록되지 않은 프롬프트 템플릿 ID입니다: '${templateId}'`,
      404
    );
  }

  const prompt = renderPromptString(config.template, variables);

  return {
    templateId: config.id,
    prompt,
    systemInstruction: config.systemInstruction,
    defaultConfig: config.defaultConfig,
  };
}
