import time
import psutil
from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, BarColumn, TextColumn
from rich import box
from rich.text import Text
from datetime import datetime

class MemoryVisualizer:
    def __init__(self):
        self.console = Console()
        self.layout = Layout()

    def get_memory_stats(self):
        """Get RAM and Swap statistics."""
        virtual = psutil.virtual_memory()
        swap = psutil.swap_memory()
        return virtual, swap

    def get_process_list(self, limit=15):
        """Get list of processes sorted by memory usage."""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'status']):
            try:
                # Filter out zombie processes or access denied
                if proc.info['status'] == psutil.STATUS_ZOMBIE:
                    continue
                
                # Get memory map info if possible
                try:
                    p = psutil.Process(proc.info['pid'])
                    # maps = p.memory_maps(grouped=False) # Expensive call
                    # To be faster and lighter, we'll read /proc/pid/maps directly if linux
                    with open(f"/proc/{proc.info['pid']}/maps", 'r') as f:
                        first_line = f.readline()
                        addr_range = first_line.split()[0]
                except (Exception):
                    addr_range = "N/A"

                proc.info['addr_range'] = addr_range
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        # Sort by RSS memory (Resident Set Size)
        sorted_procs = sorted(processes, key=lambda p: p['memory_info'].rss, reverse=True)[:limit]
        return sorted_procs

    def create_header(self):
        """Create header panel."""
        return Panel(
            f"System Memory Visualizer - {datetime.now().strftime('%H:%M:%S')}",
            style="bold white on blue",
            box=box.ROUNDED
        )

    def create_memory_panel(self, virtual, swap):
        """Create the memory usage visualization panel."""
        # Convert bytes to GB
        ram_total = virtual.total / (1024**3)
        ram_used = virtual.used / (1024**3)
        ram_free = virtual.available / (1024**3)
        
        swap_total = swap.total / (1024**3)
        swap_used = swap.used / (1024**3)
        swap_free = swap.free / (1024**3)

        # Create progress bars for visual range
        
        # RAM Bar
        ram_progress = Progress(
            TextColumn("[bold cyan]{task.description}"),
            BarColumn(bar_width=None, complete_style="green", finished_style="green"),
            TextColumn("[bold white]{task.percentage:>3.0f}%"),
            expand=True
        )
        ram_task = ram_progress.add_task("RAM Usage", total=virtual.total)
        ram_progress.update(ram_task, completed=virtual.used)
        
        # Swap Bar
        swap_progress = Progress(
            TextColumn("[bold yellow]{task.description}"),
            BarColumn(bar_width=None, complete_style="red", finished_style="red"),
            TextColumn("[bold white]{task.percentage:>3.0f}%"),
            expand=True
        )
        swap_task = swap_progress.add_task("Swap/SSD Usage", total=swap.total if swap.total > 0 else 1)
        swap_progress.update(swap_task, completed=swap.used)

        # Text details
        details_table = Table.grid(expand=True, padding=(0, 2))
        details_table.add_column("Type", justify="left")
        details_table.add_column("Total", justify="right")
        details_table.add_column("Used", justify="right")
        details_table.add_column("Free", justify="right")
        
        details_table.add_row(
            "[bold cyan]RAM[/]", 
            f"{ram_total:.2f} GB", 
            f"{ram_used:.2f} GB", 
            f"{ram_free:.2f} GB"
        )
        details_table.add_row(
            "[bold yellow]Swap[/]", 
            f"{swap_total:.2f} GB", 
            f"{swap_used:.2f} GB", 
            f"{swap_free:.2f} GB"
        )

        # Combine into a renderable group
        from rich.console import Group
        
        return Panel(
            Group(
                ram_progress,
                Text("\n"),
                swap_progress,
                Text("\n"),
                details_table
            ),
            title="Memory Ranges (Status)",
            border_style="cyan",
            box=box.ROUNDED
        )

    def create_process_table(self, processes):
        """Create the process schedule table."""
        table = Table(expand=True, border_style="green", box=box.SIMPLE_HEAD)
        table.add_column("PID", justify="right", style="cyan", width=8)
        table.add_column("Process Name", style="white")
        table.add_column("RAM Usage", justify="right", style="green")
        table.add_column("Address Range", justify="right", style="yellow")

        for proc in processes:
            mem_gb = proc['memory_info'].rss / (1024**3)
            mem_mb = proc['memory_info'].rss / (1024**2)
            
            mem_str = f"{mem_gb:.2f} GB" if mem_gb >= 1 else f"{mem_mb:.0f} MB"
            
            table.add_row(
                str(proc['pid']),
                proc['name'],
                mem_str,
                proc.get('addr_range', 'N/A')
            )

        return Panel(
            table,
            title="Real-time Process Schedule",
            border_style="green",
            box=box.ROUNDED
        )

    def run(self):
        """Main loop."""
        from rich.text import Text
        
        self.layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body")
        )
        self.layout["body"].split_row(
            Layout(name="memory", ratio=1),
            Layout(name="processes", ratio=1)
        )

        with Live(self.layout, refresh_per_second=1, screen=True) as live:
            while True:
                virtual, swap = self.get_memory_stats()
                processes = self.get_process_list()

                self.layout["header"].update(self.create_header())
                self.layout["memory"].update(self.create_memory_panel(virtual, swap))
                self.layout["processes"].update(self.create_process_table(processes))
                
                time.sleep(1)

if __name__ == "__main__":
    try:
        viz = MemoryVisualizer()
        viz.run()
    except KeyboardInterrupt:
        print("\nExiting Memory Visualizer...")
