import copyfiles from '../copyfiles';
copyfiles(
  ['/home/springcomp/projects/cp/dist/index.js', '/home/springcomp/projects/cp/out/'],
  { verbose: true },
  () => {},
);
