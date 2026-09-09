export function ActivityList({ activities }: { activities: string[] }) {
  if (activities.length === 0) {
    return <span className="text-xs text-gray-400">&mdash;</span>;
  }

  return (
    <ul className="flex flex-wrap gap-1">
      {activities.map((activity) => (
        <li key={activity} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
          {activity}
        </li>
      ))}
    </ul>
  );
}
