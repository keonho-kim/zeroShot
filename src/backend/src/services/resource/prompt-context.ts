import { resourceCatalogSummary, resourcePromptBlock } from "@backend/llm/resources/prompt";
import { listResourceCatalog } from "@backend/services/resource/catalog";

export async function buildResourcePromptContext(selection: {
  activeSkillId?: string;
  activeDesignTemplateId?: string;
  activeDesignSystemId?: string;
  includeCatalogSummary?: boolean;
}): Promise<string> {
  const catalog = await listResourceCatalog();
  const skill = selection.activeSkillId
    ? catalog.skills.find((resource) => resource.id === selection.activeSkillId)
    : undefined;
  const designTemplate = selection.activeDesignTemplateId
    ? catalog.designTemplates.find((resource) => resource.id === selection.activeDesignTemplateId)
    : undefined;
  const designSystem = selection.activeDesignSystemId
    ? catalog.designSystems.find((resource) => resource.id === selection.activeDesignSystemId)
    : undefined;

  return [
    selection.includeCatalogSummary ? resourceCatalogSummary(catalog) : "",
    resourcePromptBlock("Active Skill", skill),
    resourcePromptBlock("Active Design System", designSystem),
    resourcePromptBlock("Active Design Template", designTemplate)
  ].filter(Boolean).join("\n\n");
}
