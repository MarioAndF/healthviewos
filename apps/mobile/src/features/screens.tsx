import {
  billingSections,
  bodySystems,
  pageDescriptions,
  recordCategories,
  type BillingSectionId,
  type BodySystemId,
  type HealthViewIconKey,
  type MainDestinationId,
  type RecordCategoryId,
} from "@healthviewos/app-model";
import type {
  WorkspaceDetailGroup,
  WorkspaceListRow,
  WorkspaceViewModels,
} from "@healthviewos/workspace";
import { useFocusEffect } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { PlatformIcon } from "../components/platform-icon";
import {
  DetailRow,
  GroupedList,
  GroupedListRow,
  HorizontalRail,
  IconButton,
  PageHeader,
  PageSection,
  ScreenScrollView,
  StatusPill,
  SurfaceCard,
  textStyles,
} from "../components/primitives";
import { useWorkspace } from "../context/workspace-context";
import { colors, radii } from "../theme/tokens";

type UiRow = {
  description?: string;
  detail?: string;
  icon: HealthViewIconKey;
  id: string;
  status?: string;
  title: string;
  trailingText?: string;
};

function useFocusedDestination(destinationId: MainDestinationId) {
  const { openDestination } = useWorkspace();

  useFocusEffect(
    useCallback(() => {
      openDestination(destinationId, { navigate: false });
    }, [destinationId, openDestination]),
  );
}

function LoadingState() {
  return (
    <ScreenScrollView>
      <PageHeader description="Opening your local workspace." title="HealthView" />
      <SurfaceCard>
        <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
          Loading workspace...
        </Text>
      </SurfaceCard>
    </ScreenScrollView>
  );
}

function WorkspaceReady({ children }: { children: (views: WorkspaceViewModels) => ReactNode }) {
  const { error, loading, views } = useWorkspace();

  if (loading || !views) return <LoadingState />;
  if (error) {
    return (
      <ScreenScrollView>
        <PageHeader description="The local workspace could not be opened." title="HealthView" />
        <SurfaceCard>
          <Text selectable style={{ color: colors.danger, fontSize: 14 }}>
            {error}
          </Text>
        </SurfaceCard>
      </ScreenScrollView>
    );
  }

  return children(views);
}

function readable(value?: string) {
  return value ? value.replaceAll("_", " ") : undefined;
}

function renderTrailing(row: UiRow) {
  if (row.status) return <StatusPill>{readable(row.status)}</StatusPill>;
  if (row.trailingText) {
    return (
      <Text selectable style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
        {row.trailingText}
      </Text>
    );
  }
  return <PlatformIcon color={colors.textSubtle} icon="chevron-right" />;
}

function renderRow(row: UiRow, onPress?: () => void) {
  return (
    <GroupedListRow
      description={row.description ?? row.detail}
      icon={row.icon}
      key={row.id}
      onPress={onPress}
      title={row.title}
      trailing={renderTrailing(row)}
    />
  );
}

function rowsWithIcon(rows: WorkspaceListRow[], icon: HealthViewIconKey): UiRow[] {
  return rows.map((row) => ({
    description: row.subtitle ?? row.detail,
    icon,
    id: row.id,
    status: row.status ?? row.meta,
    title: row.title,
  }));
}

function EmptyRow({
  description,
  icon = "file",
  title,
}: {
  description: string;
  icon?: HealthViewIconKey;
  title: string;
}) {
  return <GroupedListRow description={description} icon={icon} title={title} trailing={null} />;
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <SurfaceCard style={{ flex: 1, minWidth: 136 }}>
      <Text selectable style={textStyles.label}>
        {label}
      </Text>
      <Text selectable numberOfLines={1} adjustsFontSizeToFit style={textStyles.value}>
        {value}
      </Text>
    </SurfaceCard>
  );
}

function DetailGroups({ groups }: { groups: WorkspaceDetailGroup[] }) {
  if (!groups.length) {
    return (
      <GroupedList>
        <EmptyRow description="No detailed rows are available for this item." title="Details unavailable" />
      </GroupedList>
    );
  }

  return (
    <>
      {groups.map((group, index) => (
        <PageSection key={group.id} title={group.title} topSpacing={index ? 28 : 0}>
          <GroupedList>
            {group.rows.map((row) => (
              <DetailRow key={`${group.id}-${row.label}`} label={row.label} value={row.value} />
            ))}
          </GroupedList>
        </PageSection>
      ))}
    </>
  );
}

function HealthSystemCard({
  selectedSystemId,
  views,
}: {
  selectedSystemId: BodySystemId | null;
  views: WorkspaceViewModels;
}) {
  const selectedSystem = selectedSystemId ? bodySystems.find((system) => system.id === selectedSystemId) : null;
  const selectedSignal = selectedSystem
    ? views.health.systemRows.find((row) => row.bodySystem === selectedSystem.id)
    : null;

  return (
    <SurfaceCard style={{ gap: 16 }}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.pill,
            height: 48,
            justifyContent: "center",
            width: 48,
          }}
        >
          <PlatformIcon color={colors.textMuted} icon={selectedSystem?.icon ?? "activity"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            {selectedSignal?.title ?? "Overall system readiness"}
          </Text>
          <Text selectable style={{ color: colors.textSubtle, fontSize: 12.5, marginTop: 3 }}>
            {selectedSystem?.label ?? "All body systems"}
          </Text>
        </View>
        <Text selectable style={{ color: colors.text, fontSize: 30, fontWeight: "700" }}>
          {selectedSignal?.score ?? views.health.readiness}
        </Text>
      </View>
      <Text selectable style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
        {selectedSignal?.value ?? views.health.systemStatus.description}
      </Text>
    </SurfaceCard>
  );
}

function VitalCard({ item }: { item: WorkspaceViewModels["health"]["vitals"][number] }) {
  return (
    <SurfaceCard style={{ minWidth: 164 }}>
      <Text selectable style={textStyles.label}>
        {item.title}
      </Text>
      <Text selectable numberOfLines={1} adjustsFontSizeToFit style={textStyles.value}>
        {item.value}
        {item.unit ? ` ${item.unit}` : ""}
      </Text>
      <Text selectable numberOfLines={2} style={{ color: colors.textMuted, fontSize: 12.5, lineHeight: 17 }}>
        {item.detail}
      </Text>
    </SurfaceCard>
  );
}

export function HealthScreen() {
  useFocusedDestination("health");
  const { setAssistantOpen } = useWorkspace();
  const [selectedSystemId, setSelectedSystemId] = useState<BodySystemId | null>(null);

  return (
    <WorkspaceReady>
      {(views) => (
        <ScreenScrollView>
          <PageHeader
            action={<IconButton accessibilityLabel="Open chat" icon="message" onPress={() => setAssistantOpen(true)} />}
            description={pageDescriptions.health}
            title="Health"
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <SummaryMetric label="Readiness" value={`${views.health.readiness}%`} />
            <SummaryMetric label="Signals" value={String(views.health.warningSigns.length)} />
          </View>

          <PageSection title="Body Map" topSpacing={28}>
            <HealthSystemCard selectedSystemId={selectedSystemId} views={views} />
            <HorizontalRail edgeBleed={18} gap={8} sideInset={18}>
              {bodySystems.map((system) => {
                const selected = selectedSystemId === system.id;
                return (
                  <View key={system.id} style={{ alignItems: "center", gap: 8, minWidth: 68, paddingTop: 14 }}>
                    <Pressable
                      accessibilityLabel={`${system.label} system`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedSystemId((current) => (current === system.id ? null : system.id))}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        backgroundColor: selected ? colors.text : pressed ? colors.surfacePressed : colors.surfaceMuted,
                        borderRadius: radii.pill,
                        height: 54,
                        justifyContent: "center",
                        width: 54,
                      })}
                    >
                      <PlatformIcon color={selected ? colors.inverse : colors.textMuted} icon={system.icon} />
                    </Pressable>
                    <Text selectable style={{ color: selected ? colors.text : colors.textMuted, fontSize: 12, fontWeight: "600" }}>
                      {system.label}
                    </Text>
                  </View>
                );
              })}
            </HorizontalRail>
          </PageSection>

          <PageSection title="Vitals" topSpacing={30}>
            <HorizontalRail edgeBleed={18} sideInset={18}>
              {views.health.vitals.map((item) => (
                <VitalCard item={item} key={item.id} />
              ))}
            </HorizontalRail>
          </PageSection>

          <PageSection title="Warning Signs" topSpacing={30}>
            <GroupedList>
              {views.health.warningSigns.length ? (
                views.health.warningSigns.map((item) =>
                  renderRow({
                    description: item.description,
                    icon: "alert",
                    id: item.id,
                    status: item.tone,
                    title: item.title,
                  }),
                )
              ) : (
                <EmptyRow description="No active warning signs in the local workspace." icon="alert" title="No warning signs" />
              )}
            </GroupedList>
          </PageSection>

          <PageSection title="Upcoming Care" topSpacing={30}>
            <GroupedList>
              {views.health.upcomingCare.length ? (
                views.health.upcomingCare.map((item, index) =>
                  renderRow({
                    description: item.detail,
                    icon: "calendar",
                    id: `upcoming-${index}`,
                    title: item.title,
                  }),
                )
              ) : (
                <EmptyRow description="No upcoming care items are available." icon="calendar" title="No upcoming care" />
              )}
            </GroupedList>
          </PageSection>
        </ScreenScrollView>
      )}
    </WorkspaceReady>
  );
}

export function ServicesScreen() {
  useFocusedDestination("services");

  return (
    <WorkspaceReady>
      {(views) => (
        <ScreenScrollView>
          <PageHeader description={pageDescriptions.services} title="Services" />

          <PageSection title="Saved Care">
            <GroupedList>
              {views.services.rows.length ? (
                rowsWithIcon(views.services.rows, "hospital").map((row) => renderRow(row))
              ) : (
                <EmptyRow description="Saved providers and care services will appear here." icon="hospital" title="No saved services" />
              )}
            </GroupedList>
          </PageSection>

          <PageSection title="Directory" topSpacing={30}>
            <GroupedList>
              {[
                { id: "providers", title: "Providers", description: "Primary care and specialty clinicians.", icon: "stethoscope" },
                { id: "facilities", title: "Facilities", description: "Hospitals, imaging centers, and clinics.", icon: "building" },
                { id: "labs", title: "Labs", description: "Laboratory and diagnostic services.", icon: "lab" },
                { id: "pharmacy", title: "Pharmacy", description: "Medication and pharmacy services.", icon: "medication" },
              ].map((row) => renderRow(row as UiRow))}
            </GroupedList>
          </PageSection>
        </ScreenScrollView>
      )}
    </WorkspaceReady>
  );
}

export function RecordsScreen() {
  useFocusedDestination("records");
  const [selectedCategoryId, setSelectedCategoryId] = useState<RecordCategoryId>("demographics");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  return (
    <WorkspaceReady>
      {(views) => {
        const selectedCategory = recordCategories.find((category) => category.id === selectedCategoryId) ?? recordCategories[0];
        const rows = views.records.rowsByCategory[selectedCategory.id] ?? [];
        const selectedRecord = selectedRecordId ? rows.find((row) => row.id === selectedRecordId) ?? null : null;
        const detailGroups = selectedRecord ? views.records.detailGroupsById[selectedRecord.id] ?? [] : [];

        return (
          <ScreenScrollView>
            <PageHeader description={pageDescriptions.records} title="Records" />

            <HorizontalRail edgeBleed={18} gap={8} sideInset={18}>
              {recordCategories.map((category) => {
                const selected = selectedCategoryId === category.id;
                const count = views.records.countsByCategory[category.id] ?? 0;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={category.id}
                    onPress={() => {
                      setSelectedCategoryId(category.id);
                      setSelectedRecordId(null);
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: selected ? colors.text : pressed ? colors.surfacePressed : colors.surface,
                      borderRadius: radii.pill,
                      flexDirection: "row",
                      gap: 8,
                      paddingHorizontal: 13,
                      paddingVertical: 10,
                    })}
                  >
                    <PlatformIcon color={selected ? colors.inverse : colors.textMuted} icon={category.icon} size={17} />
                    <Text selectable style={{ color: selected ? colors.inverse : colors.text, fontSize: 13, fontWeight: "700" }}>
                      {category.label} {count}
                    </Text>
                  </Pressable>
                );
              })}
            </HorizontalRail>

            <PageSection title={selectedCategory.label} topSpacing={26}>
              <GroupedList>
                {rows.length ? (
                  rowsWithIcon(rows, selectedCategory.icon).map((row) =>
                    renderRow(row, () => setSelectedRecordId(row.id)),
                  )
                ) : (
                  <EmptyRow description={selectedCategory.description} icon={selectedCategory.icon} title={`No ${selectedCategory.label.toLowerCase()}`} />
                )}
              </GroupedList>
            </PageSection>

            {selectedRecord ? (
              <PageSection title={selectedRecord.title} topSpacing={30}>
                <DetailGroups groups={detailGroups} />
              </PageSection>
            ) : null}

            <PageSection title="Sources" topSpacing={30}>
              <GroupedList>
                {(selectedRecord
                  ? views.records.sourceRowsByRecordId[selectedRecord.id] ?? []
                  : views.records.sources
                ).length ? (
                  rowsWithIcon(
                    selectedRecord ? views.records.sourceRowsByRecordId[selectedRecord.id] ?? [] : views.records.sources,
                    "building",
                  ).map((row) => renderRow(row))
                ) : (
                  <EmptyRow description="No source rows are linked here." icon="building" title="No sources" />
                )}
              </GroupedList>
            </PageSection>
          </ScreenScrollView>
        );
      }}
    </WorkspaceReady>
  );
}

export function BillingScreen() {
  useFocusedDestination("billing");
  const [selectedSectionId, setSelectedSectionId] = useState<BillingSectionId>("bills");

  return (
    <WorkspaceReady>
      {(views) => {
        const selectedSection = billingSections.find((section) => section.id === selectedSectionId) ?? billingSections[0];
        const rows = views.billing.rowsBySection[selectedSection.id] ?? [];

        return (
          <ScreenScrollView>
            <PageHeader description={pageDescriptions.billing} title="Billing" />

            <HorizontalRail edgeBleed={18} gap={8} sideInset={18}>
              {billingSections.map((section) => {
                const selected = section.id === selectedSectionId;
                const count = views.billing.rowsBySection[section.id]?.length ?? 0;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={section.id}
                    onPress={() => setSelectedSectionId(section.id)}
                    style={({ pressed }) => ({
                      backgroundColor: selected ? colors.text : pressed ? colors.surfacePressed : colors.surface,
                      borderRadius: radii.pill,
                      flexDirection: "row",
                      gap: 8,
                      paddingHorizontal: 13,
                      paddingVertical: 10,
                    })}
                  >
                    <PlatformIcon color={selected ? colors.inverse : colors.textMuted} icon={section.icon} size={17} />
                    <Text selectable style={{ color: selected ? colors.inverse : colors.text, fontSize: 13, fontWeight: "700" }}>
                      {section.label} {count}
                    </Text>
                  </Pressable>
                );
              })}
            </HorizontalRail>

            <PageSection title={selectedSection.label} topSpacing={26}>
              <GroupedList>
                {rows.length ? (
                  rowsWithIcon(rows, selectedSection.icon).map((row) => renderRow(row))
                ) : (
                  <EmptyRow description={selectedSection.description} icon={selectedSection.icon} title={`No ${selectedSection.label.toLowerCase()}`} />
                )}
              </GroupedList>
            </PageSection>

            <PageSection title="Summary" topSpacing={30}>
              <GroupedList>
                {views.billing.summary.map((row) =>
                  renderRow({
                    icon: "card",
                    id: row.label,
                    title: row.label,
                    trailingText: row.value,
                  }),
                )}
              </GroupedList>
            </PageSection>
          </ScreenScrollView>
        );
      }}
    </WorkspaceReady>
  );
}

export function SettingsScreen() {
  useFocusedDestination("settings");
  const { reloadWorkspace, resetWorkspace, setAssistantOpen } = useWorkspace();

  const confirmReset = () => {
    Alert.alert("Reset workspace", "Replace the mobile workspace with seed data?", [
      { style: "cancel", text: "Cancel" },
      {
        onPress: () => {
          void resetWorkspace();
        },
        style: "destructive",
        text: "Reset",
      },
    ]);
  };

  return (
    <WorkspaceReady>
      {(views) => (
        <ScreenScrollView>
          <PageHeader description={pageDescriptions.settings} title="Settings" />

          <PageSection title="Workspace">
            <GroupedList>
              {views.settings.summary.map((row) =>
                renderRow({
                  icon: "security",
                  id: row.label,
                  title: row.label,
                  trailingText: row.value,
                }),
              )}
            </GroupedList>
          </PageSection>

          <PageSection title="Controls" topSpacing={30}>
            <GroupedList>
              {renderRow(
                {
                  description: "Reload local state from device storage.",
                  icon: "folder",
                  id: "reload",
                  title: "Reload workspace",
                },
                () => {
                  void reloadWorkspace();
                },
              )}
              {renderRow(
                {
                  description: "Restore the local seed workspace.",
                  icon: "security",
                  id: "reset",
                  title: "Reset workspace",
                },
                confirmReset,
              )}
              {renderRow(
                {
                  description: "Open the mobile assistant placeholder.",
                  icon: "message",
                  id: "chat",
                  title: "HealthView AI",
                },
                () => setAssistantOpen(true),
              )}
            </GroupedList>
          </PageSection>

          <PageSection title="Active Person" topSpacing={30}>
            <SurfaceCard>
              <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                {views.activePerson?.displayName ?? "No active person"}
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 }}>
                {views.activePerson?.addressText ?? views.activePerson?.preferredLanguage ?? "Local seed workspace"}
              </Text>
            </SurfaceCard>
          </PageSection>
        </ScreenScrollView>
      )}
    </WorkspaceReady>
  );
}
