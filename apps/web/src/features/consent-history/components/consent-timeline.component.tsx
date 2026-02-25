import { Badge, Card, CardContent } from "@repo/ui";
import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { TimelineDateGroup } from "../data/consent-timeline.query";

interface ConsentTimelineProps {
  groups: TimelineDateGroup[];
}

interface MonthGroup {
  key: string;
  label: string;
  entries: { date: Date; group: TimelineDateGroup }[];
}

function groupByMonth(groups: TimelineDateGroup[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();

  for (const group of groups) {
    const date = new Date(group.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = date.toLocaleDateString([], {
      year: "numeric",
      month: "long",
    });

    if (!map.has(key)) {
      map.set(key, { key, label, entries: [] });
    }
    map.get(key)!.entries.push({ date, group });
  }

  return Array.from(map.values());
}

function formatDay(date: Date): string {
  return date.getDate().toString();
}

function formatDayMonth(date: Date): string {
  return date.toLocaleDateString([], { month: "short" });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ConsentTimeline({ groups }: ConsentTimelineProps) {
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No consent history found.
      </p>
    );
  }

  const monthGroups = groupByMonth(groups);

  return (
    <div className="flex flex-col gap-10">
      {monthGroups.map((month) => (
        <div key={month.key}>
          <h2 className="text-lg font-semibold mb-6">{month.label}</h2>

          <div className="flex flex-col">
            {month.entries.map(({ date, group }, index) => (
              <div key={group.date}>
                <div className="flex gap-4">
                  {/* Date column with connecting line */}
                  <div className="w-16 shrink-0 flex flex-col items-center">
                    {/* Line from previous entry into this box */}
                    {index > 0 && <div className="w-0.5 h-6 bg-neutral-300" />}
                    {/* Date box */}
                    <div className="text-center rounded-md border border-neutral-300 bg-white py-2 w-full">
                      <div className="text-2xl font-bold leading-none">
                        {formatDay(date)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDayMonth(date)}
                      </div>
                    </div>
                    {/* Line from this box to next entry */}
                    {index < month.entries.length - 1 && (
                      <div className="w-0.5 flex-1 bg-neutral-300" />
                    )}
                  </div>

                  <div className={`flex-1 ${index > 0 ? "mt-6" : ""}`}>
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        to="/app/settings/consent-history/$statementId"
                        params={{ statementId: item.id }}
                        className="block mb-2 last:mb-0"
                      >
                        <Card
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          size="sm"
                        >
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {item.documentName}
                              </span>
                              <div className="flex items-center gap-3 shrink-0">
                                <Badge
                                  variant={
                                    item.status === "granted"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className={
                                    item.status === "granted"
                                      ? "bg-green-600 text-white"
                                      : "bg-red-600 text-white"
                                  }
                                >
                                  {item.status === "granted"
                                    ? "Granted"
                                    : "Revoked"}
                                </Badge>
                                <IconChevronRight className="size-5 text-muted-foreground" />
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatTime(item.statementDate)}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
