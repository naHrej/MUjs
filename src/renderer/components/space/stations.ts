export type StationId = 'radar' | 'helm' | 'tactical' | 'engineering'

export const stationMeta: Record<StationId, { label: string; icon: string; width: number; height: number }> = {
  radar: { label: 'RADAR', icon: 'pi pi-compass', width: 780, height: 880 },
  helm: { label: 'HELM', icon: 'pi pi-forward', width: 560, height: 780 },
  tactical: { label: 'TACTICAL', icon: 'pi pi-shield', width: 640, height: 840 },
  engineering: { label: 'ENGINEERING', icon: 'pi pi-cog', width: 640, height: 800 }
}

export const stations: StationId[] = ['radar', 'helm', 'tactical', 'engineering']
