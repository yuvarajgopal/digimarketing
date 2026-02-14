"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: posts } = trpc.post.scheduled.useQuery({
    from: monthStart.toISOString(),
    to: monthEnd.toISOString(),
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const dayArray = eachDayOfInterval({ start, end });
    // Pad start to align with weekday
    const startDay = start.getDay();
    const padding = Array(startDay).fill(null);
    return [...padding, ...dayArray];
  }, [currentDate]);

  const getPostsForDay = (day: Date) => {
    if (!posts) return [];
    return posts.filter((post) => post.scheduledAt && isSameDay(new Date(post.scheduledAt), day));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground">Schedule and manage posts across all clients</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="bg-background p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {days.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "bg-background p-2 min-h-[100px]",
                  !day && "bg-muted/50",
                  day && isSameDay(day, new Date()) && "ring-2 ring-primary ring-inset"
                )}
              >
                {day && (
                  <>
                    <span className={cn(
                      "text-sm",
                      !isSameMonth(day, currentDate) && "text-muted-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-1">
                      {getPostsForDay(day).map((post) => (
                        <div
                          key={post.id}
                          className="text-xs p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20"
                          title={post.content}
                        >
                          <span className="font-medium">{post.client.name}</span>
                          <div className="flex gap-0.5 mt-0.5">
                            {post.platforms.map((p) => (
                              <PlatformIcon key={p} platform={p} size="sm" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(!posts || posts.length === 0) && (
        <div className="text-center py-8">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No scheduled posts</h3>
          <p className="text-muted-foreground">Schedule posts from client post management pages</p>
        </div>
      )}
    </div>
  );
}
