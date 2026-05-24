export function LoadingOverview() {
  return (
    <section className="loading-overview">
      <article className="loading-overview__card loading-overview__card--summary">
        <div className="flex flex-col gap-3">
          <div className="skeleton skeleton--line-sm w-28" />
          <div className="skeleton skeleton--line-lg w-44" />
          <div className="skeleton skeleton--line w-full" />
        </div>

        <div className="panel-skeleton-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="loading-list__item" key={index}>
              <div className="flex items-center justify-between gap-3">
                <div className="skeleton skeleton--line w-20" />
                <div className="skeleton skeleton--line w-14" />
              </div>
              <div className="mt-4">
                <div className="skeleton h-2.5 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </article>

      <div className="loading-overview__details">
        <article className="loading-overview__card">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="loading-list__item" key={index}>
                <div className="skeleton skeleton--line-sm w-20" />
                <div className="mt-3 skeleton skeleton--line w-full" />
                <div className="mt-2 skeleton skeleton--line-sm w-28" />
              </div>
            ))}
          </div>
        </article>

        <article className="loading-overview__card">
          <div className="flex items-center justify-between gap-3">
            <div className="skeleton skeleton--line-sm w-20" />
            <div className="skeleton skeleton--line-sm w-24" />
          </div>
          <div className="mt-4 skeleton skeleton--line-lg w-48" />
          <div className="mt-3 skeleton skeleton--line w-full" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="loading-list__item" key={index}>
                <div className="skeleton skeleton--line-sm w-16" />
                <div className="mt-3 skeleton skeleton--line w-24" />
              </div>
            ))}
          </div>
        </article>

        <div className="loading-overview__metrics">
          {Array.from({ length: 2 }).map((_, index) => (
            <article className="loading-overview__card" key={index}>
              <div className="flex items-center justify-between gap-3">
                <div className="skeleton skeleton--line-sm w-24" />
                <div className="skeleton skeleton--line-sm w-16" />
              </div>
              <div className="mt-4 skeleton skeleton--line-lg w-32" />
              <div className="mt-4 skeleton h-2.5 w-full rounded-full" />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((__, detailIndex) => (
                  <div className="loading-list__item" key={detailIndex}>
                    <div className="skeleton skeleton--line-sm w-16" />
                    <div className="mt-3 skeleton skeleton--line w-20" />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
