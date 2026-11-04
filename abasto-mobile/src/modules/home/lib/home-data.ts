import type { HomeIcon } from '../components/home-chrome';

export type Product = {
  id: string;
  name: string;
  detail: string;
  packageLabel: string;
  price: string;
  unitPrice: string;
  label: string;
  imageUri: string;
};

export type Deal = {
  id: string;
  name: string;
  packageLabel: string;
  price: string;
  previousPrice: string;
  unitPrice: string;
  saving: string;
  stock: string;
  imageUri: string;
};

export const repeatProducts: Product[] = [
  {
    id: 'coca-cola',
    name: 'Coca-Cola Original 600 ml',
    detail: 'Refrescos · Charola ×24',
    packageLabel: 'Surtido rápido',
    price: '$412.80',
    unitPrice: '$17.20 / pza',
    label: 'Surtido rápido',
    imageUri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATcZ_rjqxas_Pj9S1qsGC0pYyXeb8DRU_ZTv5682biQrcPGf0WSLulPQ70yKSAkik8VkpU9WZD6Hnczv8m6_nGKfcE2LMjvpUra6Ggsfip-SzgGj4FUFihSfmu6iQzI8HHLLpmnl_D229vQIfoaNl6LPiUTU6_V1FaEwaoZo-bzQg2tW_e0Hu5cfpmjKueRtoQ4alSU1FERU3z3lv8LoP53qjFwHgYNuTosu4npVb7zMSNMukeBwjLPQ',
  },
  {
    id: 'sabritas',
    name: 'Sabritas Sal 45g',
    detail: 'Botanas · Caja ×30',
    packageLabel: '-$35 x caja',
    price: '$480.00',
    unitPrice: '$16.00 / pza',
    label: '-$35 x caja',
    imageUri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFZSZpwzV1zJbiEq6heGNvUEpmuog35l1sY4_oOUvlVRWUNp_jZfdasD25oYuhBHl11ldZ5qel2gfGpskE1Ut0uwCm4GE5r9BqQjJl1Z1oj0HQwhqvGt-Zz3yM-CTvCRZg67TS03lUR8VPkP-EQlabWeVjwQkkwcDXet84IczHIqvqBRx72r4ffwv3dWkcs1nQGzIh8oOoAbeLfgsUxo61c9jjRQwm2FRI3GKuZfc3WAb4ByQXN6fsoQ',
  },
  {
    id: 'corona',
    name: 'Corona Extra 355 ml',
    detail: 'Cerveza · Cartón ×24',
    packageLabel: 'Alta rotación',
    price: '$490.00',
    unitPrice: '$20.41 / pza',
    label: 'Alta rotación',
    imageUri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlnM5zn7pMdYIw9ha10WlI2L_TBeCyllwhwqRB8FZnz2-AM3X7wGJY36udZiKhrcfK2ys_wUd2Sn07qKVBakqwmwmBJEZq7GkpM_Qi49VZO1YaIBknUQ3tHVGMINLgb4tMpQhbISFNvYJvAR79ZC7py1DhPbO3M-2MdEy60YpzYLJjSPQdO0LTU0duxAHRuXMpALdIxcmmTaq_dGozKvoarT3Kqyr02ni7Btmdwp3cbidjH1RNpMHhUQ',
  },
  {
    id: 'aceite',
    name: 'Aceite 1-2-3 1 Litro',
    detail: 'Abarrotes · Caja ×12',
    packageLabel: '-$28 x caja',
    price: '$396.00',
    unitPrice: '$33.00 / pza',
    label: '-$28 x caja',
    imageUri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXq4XrWCRIzUdHKd7Mr-KnnGomZs7fQyJb-42hYQKAY9cNcx8fbuP6mJqhVR9yZ1m1x6XS60-_8vi_A3Y87OKVCASrG-C1-z2X6n8QvzdNV2DbyOn8HUWkXFO4KKCfq4Qjvz4TbRA0ICm5tsG10REDiM8EcKe08jV8fic1etx7914LPtTArcKw5m8bvHSUaIX7AelC0GYGOaNiV9KlFJyMpHB9irUv8EuS57Nsg56IGnowycs3dSegdg',
  },
];

export const weeklyDeals: Deal[] = [
  {
    id: 'nescafe',
    name: 'Nescafé Clásico Frasco 225g',
    packageLabel: 'Charola ×12',
    price: '$816.00',
    previousPrice: '$960.00',
    unitPrice: '($68/u)',
    saving: '-15%',
    stock: 'En existencia',
    imageUri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuLUyuJAFfOoDrJravSnxUVs1GeP7xQ89x4rxwbn9-11kf_m1FzODNBfQkQzmC38pG1T8eO6Zdsir9WUt-AQYsF9nRnlz9pIgzrCMFoZGSr2KJRc42cUJEPvQ_qjyODAcid2RM1Wk_8b4duCRN8VNcULm-7Q9-Q2_JuyMOlJDEOPY7l61xie70osQyibZ5NtTmRvXejLuyVKaHveYnxWXACGGL6tnT0D1BJsmkuGb5EA5dZrJ_zhR3WQ',
  },
  {
    id: 'fabuloso',
    name: 'Fabuloso Lavanda 1 Litro',
    packageLabel: 'Caja ×15',
    price: '$315.00',
    previousPrice: '$355.00',
    unitPrice: '($21/u)',
    saving: '-$40 x caja',
    stock: 'En existencia',
    imageUri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCP31_C2RDYKrL0FDsE5DyYmNkt_4RZ1S-MCmHg2kxx16GNWXVnXMqzyYHHPfWywg7SwTU3GxPgwPG6lTjhKTUKfMHOX19ASKz-4MNR_dcX31Wxil-VkTU3yqwLW4W-FMJ2-9WgLDFoxr27v9cfn-tyomAs_jzV7N6en89Bvd9dsb4CrNYZ-lAYERZYISsC6ghVjcBcCpRh_6Vu2qdtitoPdcgGu_PAkQkf8dC5T0eTA0B0D-KvJTM_sQ',
  },
];

export const categories = [
  { name: 'Bebidas', icon: 'beverages' },
  { name: 'Cervezas', icon: 'beer' },
  { name: 'Botanas', icon: 'snacks' },
  { name: 'Abarrotes', icon: 'groceries' },
  { name: 'Limpieza', icon: 'cleaning' },
  { name: 'Lácteos', icon: 'dairy' },
  { name: 'Dulces', icon: 'sweets' },
  { name: 'Higiene', icon: 'hygiene' },
] satisfies { name: string; icon: HomeIcon }[];
