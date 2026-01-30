import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortByCourseTeeName',
  standalone: true
})
export class SortByCourseTeeNamePipe implements PipeTransform {
  transform(scorecards: any[]): any[] {
    if (!Array.isArray(scorecards)) return scorecards;
    return [...scorecards].sort((a, b) => {
      const aName = (a.courseTeeName || '').toLowerCase();
      const bName = (b.courseTeeName || '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }
}
