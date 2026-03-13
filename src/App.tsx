import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";

import {
  Container,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Stack,
  Checkbox,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Menu,
} from "@mui/material";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ClearIcon from "@mui/icons-material/Clear";
import MenuIcon from "@mui/icons-material/Menu";

type Attendee = {
  ln: string;
  fn: string;
  display: string;
  en?: string;
  chinese?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  category: string;
  language?: string;
  notes?: string;
  dateAdded?: string;
};

type AttendeeCSV = {
  "Last Name": string;
  "First Name": string;
  "Display Name": string;
  "English Name (if differnet from legal name)"?: string;
  "Chinese Name"?: string;
  Email?: string;
  Phone?: string;
  "Street Address"?: string;
  City?: string;
  State?: string;
  ZIP?: string;
  Category: string;
  "Primary Language"?: string;
  Notes?: string;
  "Date Added"?: string;
};

function App() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const firstMatchRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newAttendee, setNewAttendee] = useState<Partial<Attendee>>({
    category: "Adult",
  });

  useEffect(() => {
    document.body.style.background = "white";
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("checkins");
    if (saved) {
      setChecked(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (firstMatchRef.current) {
      firstMatchRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [search]);

  useEffect(() => {
    const savedAttendees = localStorage.getItem("attendees");
    if (savedAttendees) {
      setAttendees(JSON.parse(savedAttendees));
    }
    const savedChecked = localStorage.getItem("checkins");
    if (savedChecked) {
      setChecked(JSON.parse(savedChecked));
    }
  }, []);

  const getTodaysDate = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const dayStr = today.toLocaleDateString("en-US", { weekday: "long" });
    return `${dateStr} (${dayStr})`;
  };

  function toggle(name: string) {
    setChecked((prev) => {
      const updated = { ...prev, [name]: !prev[name] };
      localStorage.setItem("checkins", JSON.stringify(updated)); // persist immediately
      return updated;
    });
  }

  function resetCheckins() {
    setChecked({});
    setAttendees([]);
    localStorage.removeItem("checkins");
    localStorage.removeItem("attendees");
  }

  function startNewCheckIn() {
    if (attendees.length === 0) {
      // List is empty, load attendees
      fileInputRef.current?.click();
    } else {
      // List is not empty
      const hasChecked = Object.values(checked).some(Boolean);
      if (hasChecked) {
        // Show confirmation modal
        setConfirmClearOpen(true);
      } else {
        // No checked attendees, just clear
        setChecked({});
        localStorage.setItem("checkins", JSON.stringify({}));
      }
    }
  }

  function confirmClearCheckins() {
    setChecked({});
    localStorage.setItem("checkins", JSON.stringify({}));
    setConfirmClearOpen(false);
  }

  function loadCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<AttendeeCSV>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const people = results.data.map((row) => ({
          ln: row["Last Name"],
          fn: row["First Name"],
          display: row["Display Name"],
          en: row["English Name (if differnet from legal name)"],
          chinese: row["Chinese Name"],
          email: row["Email"],
          phone: row["Phone"],
          street: row["Street Address"],
          city: row["City"],
          state: row["State"],
          zip: row["ZIP"],
          category: row["Category"],
          language: row["Primary Language"],
          notes: row["Notes"],
          dateAdded: row["Date Added"],
        }));

        people.sort((a, b) => a.display.localeCompare(b.display));

        setAttendees(people);
        localStorage.setItem("attendees", JSON.stringify(people));

        // Reset file input to allow reloading the same file
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  }

  const filtered = attendees.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.display?.toLowerCase().includes(q) ||
      a.chinese?.toLowerCase().includes(q)
    );
  });

  const counts: Record<string, number> = {
    "Pre-K": 0,
    "K-8": 0,
    HS: 0,
    Adult: 0,
  };

  attendees.forEach((a) => {
    if (checked[a.display]) {
      if (counts[a.category] !== undefined) {
        counts[a.category]++;
      }
    }
  });

  const totalChecked = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );

  function downloadFile(data: string, filename: string) {
    const blob = new Blob([data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  function exportCheckins() {
    const today = new Date().toISOString().split("T")[0];

    const rows = Object.keys(checked)
      .filter((k) => checked[k])
      .map((name) => `${today},"${name}"`);

    const csv = "Date,Display Name\n" + rows.join("\n");

    const defaultFilename = `checkins-${today}.csv`;
    const filename = window.prompt("Enter filename:", defaultFilename);

    if (filename) {
      downloadFile(csv, filename);
    }
  }

  function exportAttendees() {
    if (!attendees.length) return;

    const today = new Date().toISOString().split("T")[0];

    // Export in the same format we import, so it can be reloaded later.
    const headers = [
      "Last Name",
      "First Name",
      "Display Name",
      "English Name (if differnet from legal name)",
      "Chinese Name",
      "Email",
      "Phone",
      "Street Address",
      "City",
      "State",
      "ZIP",
      "Category",
      "Primary Language",
      "Notes",
      "Date Added",
    ];

    const quote = (value: any) => {
      const str = value == null ? "" : String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = attendees.map((a) =>
      [
        a.ln,
        a.fn,
        a.display,
        a.en,
        a.chinese,
        a.email,
        a.phone,
        a.street,
        a.city,
        a.state,
        a.zip,
        a.category,
        a.language,
        a.notes,
        a.dateAdded,
      ]
        .map(quote)
        .join(","),
    );

    const csv = headers.join(",") + "\n" + rows.join("\n");

    downloadFile(csv, `attendees-updated-${today}.csv`);
  }

  function handleAddAttendee() {
    if (!newAttendee.ln || !newAttendee.fn) {
      alert("Last Name and First Name are required.");
      return;
    }

    const display =
      `${newAttendee.ln}, ${newAttendee.fn}` +
      (newAttendee.en ? ` (${newAttendee.en})` : "");

    const today = new Date().toISOString().split("T")[0];

    const person: Attendee = {
      ...(newAttendee as Attendee),
      display,
      dateAdded: today,
    };

    const updated = [...attendees, person];

    updated.sort((a, b) => a.display.localeCompare(b.display));

    setAttendees(updated);
    localStorage.setItem("attendees", JSON.stringify(updated));
    setAddOpen(false);
    setNewAttendee({ category: "Adult" });
  }

  return (
    <Container
      maxWidth={false}
      sx={{ mt: 3, px: 2, background: "white", minHeight: "100vh" }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          background: "white",
          zIndex: 10,
          pb: 2,
          borderBottom: "1px solid #ddd",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h4" gutterBottom color="black">
            CPC Check-in
          </Typography>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MenuIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" color="black" sx={{ mt: 1 }}>
            Today's Date: <b>{getTodaysDate()}</b>
          </Typography>
        </Box>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              fileInputRef.current?.click();
              setMenuAnchor(null);
            }}
          >
            Import Attendees
          </MenuItem>
          <MenuItem
            onClick={() => {
              exportAttendees();
              setMenuAnchor(null);
            }}
          >
            Export Attendees
          </MenuItem>
          <MenuItem
            onClick={() => {
              resetCheckins();
              setMenuAnchor(null);
            }}
          >
            Reset Attendees
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAboutOpen(true);
              setMenuAnchor(null);
            }}
          >
            About CPC Check-In
          </MenuItem>
        </Menu>

        <Stack spacing={2}>
          <input ref={fileInputRef} hidden type="file" onChange={loadCSV} />

          <TextField
            label="Search attendee"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton onClick={() => setSearch("")}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={3}>
            <Typography color="black">Pre-K: {counts["Pre-K"]}</Typography>
            <Typography color="black">K-8: {counts["K-8"]}</Typography>
            <Typography color="black">HS: {counts["HS"]}</Typography>
            <Typography color="black">Adult: {counts["Adult"]}</Typography>
            <Typography color="black" sx={{ fontWeight: "bold" }}>
              TOTAL: {totalChecked}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              sx={{ backgroundColor: "green", color: "white" }}
              onClick={startNewCheckIn}
            >
              Start New Check-In
            </Button>

            <Button
              variant="contained"
              sx={{ backgroundColor: "#0088f8", color: "white" }}
              onClick={() => setAddOpen(true)}
              disabled={attendees.length === 0}
            >
              Add New Attendee
            </Button>

            <Button
              variant="contained"
              sx={{ backgroundColor: "red", color: "white" }}
              onClick={exportCheckins}
              disabled={attendees.length === 0}
            >
              Finish & Export
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box
        sx={{ maxHeight: "65vh", overflow: "auto", mt: 2, background: "white" }}
      >
        {filtered.map((a, index) => {
          const label = a.chinese ? `${a.display} [${a.chinese}]` : a.display;
          const isChecked = checked[a.display] || false;

          return (
            <Box
              key={`${a.ln}-${a.fn}-${index}`}
              ref={index === 0 ? firstMatchRef : null}
              onClick={() => toggle(a.display)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #eee",
                padding: "10px 0",
                cursor: "pointer",
                color: "black",
                background: isChecked ? "#e8f5e9" : "white",
              }}
            >
              <Box display="flex" alignItems="center">
                <Checkbox checked={isChecked} />

                <Typography variant="h6">{label}</Typography>
              </Box>

              {isChecked && <CheckCircleIcon sx={{ color: "#4caf50" }} />}
            </Box>
          );
        })}
      </Box>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Attendee</DialogTitle>

        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, ln: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, fn: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="English Name"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, en: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Chinese Name"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, chinese: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, email: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, phone: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, street: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                fullWidth
                label="City"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, city: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                fullWidth
                label="State"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, state: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                fullWidth
                label="ZIP"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, zip: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>

                <Select
                  value={newAttendee.category || ""}
                  label="Category"
                  onChange={(e) =>
                    setNewAttendee({ ...newAttendee, category: e.target.value })
                  }
                >
                  <MenuItem value="Pre-K">Pre-K</MenuItem>
                  <MenuItem value="K-8">K-8</MenuItem>
                  <MenuItem value="HS">HS</MenuItem>
                  <MenuItem value="Adult">Adult</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Primary Language</InputLabel>

                <Select
                  value={newAttendee.language || ""}
                  label="Primary Language"
                  onChange={(e) =>
                    setNewAttendee({ ...newAttendee, language: e.target.value })
                  }
                >
                  <MenuItem value="Mandarin">Mandarin</MenuItem>
                  <MenuItem value="Cantonese">Cantonese</MenuItem>
                  <MenuItem value="English">English</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, notes: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAttendee}>
            Add Attendee
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)}>
        <DialogTitle>About</DialogTitle>

        <DialogContent>
          <Typography>The CPC check-in app allows volunteers to:</Typography>

          <ul>
            <li>Import existing attendees</li>
            <li>Add new attendees to the list</li>
            <li>Search attendees quickly</li>
            <li>Check people in</li>
            <li>Export attendance records</li>
          </ul>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setAboutOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
      >
        <DialogTitle>Confirm Clear Check-ins</DialogTitle>

        <DialogContent>
          <Typography>
            This will clear all your checked attendees. Are you sure?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmClearOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmClearCheckins}
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App;
