import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Tables, TablesInsert, TablesUpdate } from '../../types/supabase';
import { from, map, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ChartConfigurationService {

    constructor(private supabaseService: SupabaseService) { }

    getChartConfigurations(userId: string): Observable<Tables<'chart_configurations'>[]> {
        return from(
            this.supabaseService.supabase
                .from('chart_configurations')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
        ).pipe(
            map(response => {
                if (response.error) throw response.error;
                return (response.data || []) as any[];
            })
        );
    }

    createChartConfiguration(config: TablesInsert<'chart_configurations'>) {
        return from(
            this.supabaseService.supabase
                .from('chart_configurations')
                .insert(config)
                .select()
                .single()
        ).pipe(
            map(response => {
                if (response.error) throw response.error;
                return response.data;
            })
        );
    }

    deleteChartConfiguration(id: string) {
        return from(
            this.supabaseService.supabase
                .from('chart_configurations')
                .delete()
                .eq('id', id)
        ).pipe(
            map(response => {
                if (response.error) throw response.error;
                return response.data;
            })
        );
    }
}
