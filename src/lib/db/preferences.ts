import type { ThemeColor } from '$lib/stores/theme.svelte';
import { apiGet, apiPut } from '$lib/api/client';

export interface UserPreferences {
	theme_color: ThemeColor;
}

export async function loadUserPreferences(): Promise<UserPreferences | null> {
	try {
		return await apiGet<UserPreferences | null>('/api/preferences');
	} catch {
		return null;
	}
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<void> {
	await apiPut('/api/preferences', preferences);
}
