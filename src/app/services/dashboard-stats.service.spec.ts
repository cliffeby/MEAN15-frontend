import { DashboardStatsService } from './dashboard-stats.service';
import { signal } from '@angular/core';
import { Match } from '../models/match';

describe('DashboardStatsService', () => {
  let service: DashboardStatsService;

  beforeEach(() => {
    service = new DashboardStatsService();
  });

  describe('calculateGroupsThisYear', () => {
    it('should return correct count for matches in the given year', () => {
      const matches = [
        { datePlayed: '2025-01-15' } as Match,
        { datePlayed: '2025-06-10' } as Match,
        { datePlayed: '2024-07-20' } as Match,
        { datePlayed: '2025-09-05' } as Match
      ];
      const matchesSignal = signal(matches);
      const result = service.calculateGroupsThisYear(matchesSignal, 2025);
      expect(result()).toBe(3);
    });

    it('should return 0 if no matches in the given year', () => {
      const matches = [
        { datePlayed: '2024-01-15' } as Match,
        { datePlayed: '2023-06-10' } as Match
      ];
      const matchesSignal = signal(matches);
      const result = service.calculateGroupsThisYear(matchesSignal, 2025);
      expect(result()).toBe(0);
    });
  });

  describe('calculateMatchesPast12Months', () => {
    it('should return correct count for matches in the past 12 months', () => {
      const now = new Date('2025-11-29');
      const matches = [
        { datePlayed: '2025-11-01' } as Match,
        { datePlayed: '2025-06-10' } as Match,
        { datePlayed: '2024-12-01' } as Match,
        { datePlayed: '2024-10-15' } as Match // outside 12 months
      ];
      const matchesSignal = signal(matches);
      const result = service.calculateMatchesPast12Months(matchesSignal, now);
      expect(result()).toBe(3);
    });

    it('should return 0 if no matches in the past 12 months', () => {
      const now = new Date('2025-11-29');
      const matches = [
        { datePlayed: '2024-09-01' } as Match,
        { datePlayed: '2023-06-10' } as Match
      ];
      const matchesSignal = signal(matches);
      const result = service.calculateMatchesPast12Months(matchesSignal, now);
      expect(result()).toBe(0);
    });
  });

  describe('calculateLowestNetScore', () => {
    it('should return the correct member and score for the lowest net score', () => {
      const members = [
        { _id: '1', firstName: 'Alice', lastName: 'Smith' },
        { _id: '2', firstName: 'Bob', lastName: 'Jones' }
      ];
      const scores = [
        { memberId: '1', score: 72, datePlayed: '2025-11-01',handicap:2 },
        { memberId: '2', score: 68, datePlayed: '2025-10-01',handicap:0 }
      ];
      const membersSignal = signal(members as any);
      const scoresSignal = signal(scores as any);
      const result = service.calculateLowestNetScore(scoresSignal, membersSignal);
      expect(result()).toEqual({
        score: 68,
        netScore: 68,
        memberName: 'Bob Jones',
        datePlayed: '2025-10-01'
      });
    });
    it('should return null if no scores', () => {
      const membersSignal = signal([]);
      const scoresSignal = signal([]);
      const result = service.calculateLowestNetScore(scoresSignal, membersSignal);
      expect(result()).toBeNull();
    });
  });

  describe('calculateHighestNetScore', () => {
    it('should return the correct member and score for the highest net score', () => {
      const members = [
        { _id: '1', firstName: 'Alice', lastName: 'Smith' },
        { _id: '2', firstName: 'Bob', lastName: 'Jones' }
      ];
          const scores = [
      { memberId: '1', score: 72, handicap: 2, datePlayed: '2025-11-01' },
      { memberId: '2', score: 68, handicap: 0, datePlayed: '2025-10-01' }
      ];
      const membersSignal = signal(members as any);
      const scoresSignal = signal(scores as any);
      const result = service.calculateHighestNetScore(scoresSignal, membersSignal);
      expect(result()).toEqual({
        score: 72,
        netScore: 70,
        memberName: 'Alice Smith',
        datePlayed: '2025-11-01'
      });
    });
    it('should return null if no scores', () => {
      const membersSignal = signal([]);
      const scoresSignal = signal([]);
      const result = service.calculateHighestNetScore(scoresSignal, membersSignal);
      expect(result()).toBeNull();
    });
  });

  describe('calculateTopFrequentPlayers', () => {
    it('should return the top 5 most active players in the past 12 months with correct round counts and member names', () => {
      const now = new Date('2025-11-29');
      const members = [
        { _id: '1', firstName: 'Alice', lastName: 'Smith' },
        { _id: '2', firstName: 'Bob', lastName: 'Jones' },
        { _id: '3', firstName: 'Carol', lastName: 'White' }
      ];
      const scores = [
        { memberId: '1', score: 72, datePlayed: '2025-11-01' },
        { memberId: '1', score: 70, datePlayed: '2025-10-01' },
        { memberId: '2', score: 68, datePlayed: '2025-09-01' },
        { memberId: '2', score: 69, datePlayed: '2025-08-01' },
        { memberId: '3', score: 75, datePlayed: '2025-07-01' },
        { memberId: '1', score: 71, datePlayed: '2025-06-01' },
        { memberId: '2', score: 70, datePlayed: '2025-05-01' }
      ];
      const membersSignal = signal(members as any);
      const scoresSignal = signal(scores as any);
      const result = service.calculateTopFrequentPlayers(scoresSignal, membersSignal, now);
      expect(result().length).toBeLessThanOrEqual(5);
      expect(result()[0]).toEqual({ memberName: 'Alice Smith', rounds: 3, memberId: '1' });
      expect(result()[1]).toEqual({ memberName: 'Bob Jones', rounds: 3, memberId: '2' });
      expect(result()[2]).toEqual({ memberName: 'Carol White', rounds: 1, memberId: '3' });
    });
   it('should return an empty array if no scores in the past 12 months', () => {
      const now = new Date('2025-11-29');
      const membersSignal = signal([]);
      const scoresSignal = signal([]);
      const result = service.calculateTopFrequentPlayers(scoresSignal, membersSignal, now);
      expect(result()).toEqual([]);
    });
  });
});
