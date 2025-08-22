import { useEffect, useMemo, useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'



function pad2(n: number): string { return String(n).padStart(2, '0') }

function minutesToClockLabel(totalMinutes: number): string {
	const mins = ((totalMinutes % 1440) + 1440) % 1440
	const hours = Math.floor(mins / 60)
	const minutes = mins % 60
	return `${pad2(hours)}:${pad2(minutes)}`
}

function formatDuration(mins: number): string {
	const m = Math.max(0, Math.round(mins))
	const h = Math.floor(m / 60)
	const r = m % 60
	if (h === 0) return `${r}m`
	if (r === 0) return `${h}h`
	return `${h}h ${r}m`
}

function useNowMinutes(): number {
	const [nowMins, setNowMins] = useState<number>(() => {
		const d = new Date()
		return d.getHours() * 60 + d.getMinutes()
	})
	useEffect(() => {
		const id = setInterval(() => {
			const d = new Date()
			setNowMins(d.getHours() * 60 + d.getMinutes())
		}, 15000)
		return () => clearInterval(id)
	}, [])
	return nowMins
}

// dial removed for a simpler, phone-friendly form UI

function MinSleepSlider({ value, onChange, min = 0, max = 12, step = 0.5 }: { value: number, onChange: (n: number) => void, min?: number, max?: number, step?: number }) {
	const clamped = Math.min(max, Math.max(min, value))
	const percent = ((clamped - min) / (max - min)) * 100
	const thumbWidth = 26
	const adjustPx = thumbWidth / 2 - (thumbWidth * percent / 100)
	const left = `calc(${percent}% + ${adjustPx}px)`
	return (
		<div className="range">
			<div className="range-row">
				<span className="range-edge">{min}h</span>
				<div className="range-track">
					<input
						className="range-input"
						type="range"
						min={min}
						max={max}
						step={step}
						value={clamped}
						onChange={(e) => onChange(Number(e.target.value))}
					/>
					<div className="range-bubble" style={{ left }}>{clamped}h</div>
				</div>
				<span className="range-edge">{max}h</span>
			</div>
		</div>
	)
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#3fa9f5' },
    background: { default: '#0a1930', paper: 'rgba(16, 42, 67, 0.9)' },
    text: { primary: '#ffffff', secondary: '#9fb3c8' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(16, 42, 67, 0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: 'rgba(255,255,255,0.06)',
          '& .MuiOutlinedInput-input': { color: '#ffffff' },
          '& fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.32)' },
          '&.Mui-focused fieldset': { borderColor: '#3fa9f5' },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { color: '#9fb3c8' } },
    },
  },
})

export default function App() {
	const [showShortcutInfo, setShowShortcutInfo] = useState(false)
	const nowMins = useNowMinutes()
	const [sleepStartMins, setSleepStartMins] = useState<number>(nowMins)
	const [fallAsleepMins, setFallAsleepMins] = useState<number>(15)
	const [fallOption, setFallOption] = useState<'0' | '5' | '15' | '30'>('15')
	const [minSleepHours, setMinSleepHours] = useState<number>(6)

	// Fortune cookie
	const [fortuneText, setFortuneText] = useState<string>('')

	const refreshFortune = async () => {
		setFortuneText('')
		const controller = new AbortController()
		const id = setTimeout(() => controller.abort(), 6000)
		const primaryUrl = 'https://api.viewbits.com/v1/fortunecookie?mode=random'
		try {
			const r = await fetch(primaryUrl, { cache: 'no-store', signal: controller.signal })
			const data = await r.json()
			if (data && data.text) {
				setFortuneText(String(data.text))
				clearTimeout(id)
				return
			}
		} catch {}
		clearTimeout(id)
		try {
			const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(primaryUrl)
			const r2 = await fetch(proxyUrl, { cache: 'no-store' })
			const j2 = await r2.json()
			if (j2 && j2.contents) {
				const parsed = JSON.parse(j2.contents)
				if (parsed && parsed.text) {
					setFortuneText(String(parsed.text))
					return
				}
			}
		} catch {}
		setFortuneText('One that would have the fruit must climb the tree.')
	}

	useEffect(() => { refreshFortune() }, [])

	useEffect(() => {
		setFallAsleepMins(Number(fallOption))
	}, [fallOption])

	useEffect(() => {
		setSleepStartMins(prev => {
			const drift = Math.abs(prev - nowMins)
			return drift <= 1 ? nowMins : prev
		})
	}, [nowMins])

	const suggestions = useMemo(() => {
		const cycle = 90
		const minRequired = minSleepHours * 60
		const result: Array<{ n: number, wakeMins: number, totalSleepMins: number, sinceStartMins: number, meets: boolean }> = []
		for (let n = 1; n <= 10; n++) {
			const total = n * cycle + fallAsleepMins
			const meets = total >= minRequired
			const wake = (sleepStartMins + total) % 1440
			result.push({ n, wakeMins: wake, totalSleepMins: n * cycle, sinceStartMins: total, meets })
		}
		const firstMeetIdx = result.findIndex(r => r.meets)
		if (firstMeetIdx === -1) return result.slice(-3)
		return result.slice(firstMeetIdx, Math.min(result.length, firstMeetIdx + 3))
	}, [sleepStartMins, fallAsleepMins, minSleepHours])

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<div className="container">
			<header>
				<div>
					<div className="title">REM Cycle Alarm</div>
					<div className="subtitle">Pick your sleep start, add time to fall asleep, set a minimum, and get alarm times aligned to 90-minute cycles.</div>
				</div>
				<div className="row">
					{/* <button className="btn secondary" onClick={() => setSleepStartMins(nowMins)}>Now</button> */}
					<button className="btn secondary" onClick={() => { setFallOption('15'); setMinSleepHours(6) }}>Reset</button>
					{/* <a className="btn" href="https://github.com/" target="_blank" rel="noreferrer">Star</a> */}
				</div>
			</header>

			{/* 1) Sleep start */}
			<div className="card">
				{/* <h3>1) Sleep start</h3> */}
				<div className="section">
					
					<div className="control fit-row" style={{ alignItems: 'center' }}>
						<label>Sleep start</label>
						<div className="segmented segmented-nowrap">
						<div className="row row-nowrap" style={{ alignItems: 'center', gap: 12 }}>
						<div style={{ flex: 1, minWidth: 0 }}>
							<LocalizationProvider dateAdapter={AdapterDayjs}>
								<TimePicker
									ampm={false}
									value={dayjs().startOf('day').add(sleepStartMins, 'minute') as unknown as Dayjs}
									onChange={(v) => {
										if (!v) return
										const minutes = v.hour() * 60 + v.minute()
										setSleepStartMins(minutes % 1440)
									}}
									slotProps={{ textField: { style: { width: 120 }, size: 'small', variant: 'outlined' } }}
								/>
							</LocalizationProvider>
						</div>
						<button className="btn secondary compact" style={{ whiteSpace: 'nowrap' }} onClick={() => setSleepStartMins(nowMins)}>Set to now</button>
					</div>
				</div>
					</div>
					</div>
			</div>

			{/* 2) Fall asleep time */}
			<div className="card">
				{/* <h3>2) Fall asleep time</h3> */}
				<div className="section">
					<div className="control fit-row" style={{ alignItems: 'center' }}>
						<label>Time to fall asleep</label>
						<div className="segmented segmented-nowrap">
							{(['0','5','15','30'] as const).map(key => (
								<button
									key={key}
									className={`chip ${fallOption === key ? 'active' : ''}`}
									onClick={() => setFallOption(key)}
								>
									{key}
								</button>
							))}
						</div>
						<span className="muted">min</span>
					</div>
				</div>
			</div>

			{/* 3) Minimum sleep duration */}
			<div className="card">
				{/* <h3>3) Minimum sleep duration</h3> */}
				<div className="section">
					<div className="control" style={{ alignItems: 'center' }}>
						<label>Minimum sleep</label>
						<div style={{ flex: 1, minWidth: 220 }}>
							<div className="segmented slider-bubble">
								<MinSleepSlider value={minSleepHours} onChange={setMinSleepHours} />
							</div>
						</div>
						{/* custom numeric input removed */}
					</div>
				</div>
			</div>

			<div className="card">
			<div className="section results">
				<div className="row">
				<div className="time-display" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <span className="time-primary">Calculated alarms</span>
  <button
    onClick={() => setShowShortcutInfo(true)}
    className="info-icon"
    aria-label="How to install Shortcut"
  >
    ℹ️
  </button>
</div>
				</div>

				{suggestions.map((s, idx) => {
				const wakeTime = minutesToClockLabel(s.wakeMins) // e.g. "07:30"
				const shortcutLink = `shortcuts://run-shortcut?name=remcalc&input=${encodeURIComponent(wakeTime)}`
				return (
					<div key={idx} className="item">
					<div>
						<div className="time">{wakeTime}</div>
						<div className="meta">{s.n} × 90m cycles</div>
					</div>
					<div className="row" style={{ gap: 8, alignItems: "center" }}>
						<span className="pill pill-darkblue">{formatDuration(s.totalSleepMins)}</span>
						<a href={shortcutLink} className="pill pill-blue">
						Set ⏰
						</a>
					</div>
					</div>
				)
				})}
				{showShortcutInfo && (
  <div className="modal">
    <div className="modal-content">
      <h3>Enable Shortcut Alarms</h3>
      <ol>
        <li>
          Install the{' '}
          <a
            href="https://www.icloud.com/shortcuts/c03903c8fe4746a8aa17ec99340fa663"
            target="_blank"
            rel="noopener noreferrer"
          >
            remcalc Shortcut
          </a>
        </li>
        <li>
          In iOS: go to <b>Settings → Shortcuts → Allow Untrusted Shortcuts</b>
        </li>
        <li>
          After that, the ⏰ buttons here will open your Clock app and set alarms.
        </li>
      </ol>
	  <span
  className="close-cross"
  onClick={() => setShowShortcutInfo(false)}
  aria-label="Close modal"
>
  ✖️
</span>
    </div>
  </div>
)}
			</div>
			</div>


			{/* Fortune cookie */}
			<div className="card">
				<div className="section">
					<div className="fortune">
						{fortuneText ? (
							<div className="fortune-text">“{fortuneText}”</div>
						) : (
							<div className="fortune-text muted">Loading a fortune…</div>
						)}
					</div>
				</div>
			</div>

			<div className="row" style={{ justifyContent: 'space-between' }}>
				{/* <div className="footer-note">No tracking. 100% client-side.</div> */}
			</div>
		</div>
		</ThemeProvider>
	)
}

