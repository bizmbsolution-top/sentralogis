
$path = "components\sbu\FleetTrackingConsole.tsx"
$content = Get-Content $path -Raw

# Remove duplicate groupedJos
$pattern = 'const groupedJos = useMemo\(\(\) => \{[\s\S]+?\}, \[filteredJos\]\);\s+const groupedJos = useMemo\(\(\) => \{[\s\S]+?\}, \[filteredJos\]\);'
$replacement = 'const groupedJos = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredJos.forEach(jo => {
      const key = jo.wo_number || "Unassigned WO";
      if (!groups[key]) groups[key] = [];
      groups[key].push(jo);
    });
    return groups;
  }, [filteredJos]);'

$content = [regex]::Replace($content, $pattern, $replacement)

Set-Content $path $content
